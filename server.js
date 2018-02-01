const express = require('express');
const logger = require('morgan');
const path = require('path');

const app = express();

const server = require('http').createServer(app);
// keep the heroku app awake!!
setInterval(function() {
  console.log('THE LIGHTS TURN ON...');
  console.log('THE LIGHTS GO OFF...');
  console.log('LIFE IS SHORT...');
  console.log('WAKE UP!!');
  require('http').get('http://cardsagainstyoursanity.herokuapp.com');
}, 300000);

app.use(logger('dev'));
app.use(express.static(`${__dirname}/public`));

const port = process.env.PORT || 3001;

server.listen(port, function() {
  console.log(`Horrible people listen to ${port}`);
});

const io = require('socket.io')(server);
const cards = require('./cards.js');

const gameRooms = {};

class GameRoom {
  constructor(roomCode) {
    this.roomCode = roomCode;
    this.whiteDeck = new CardDeck([...cards.whiteCards]);
    this.blackDeck = new CardDeck([...cards.blackCards]);
    this.playerList = new PlayerList(roomCode);
    this.currentBlackCard = null;
    this.currentCardCzar = null;
    this.playerSelections = [];
    this.winningCards = [];
    this.stage = 'waiting for ready';
  }
  
  addToRoom(name, id) {
    this.playerList.players[id] = new Player(name, id, this.roomCode);
    this.playerList.players[id].refillWhiteCards(this.whiteDeck.cards);
  }

  removeFromRoom(id) {
    const { roomCode, playerList, playerSelections } = this;
    const { players, pending } = playerList;

    // delete player from playerList and let other players know someone left
    let departingPlayer = players[id].name;
    console.log(`${departingPlayer} left room ${roomCode}`);
    delete players[id];
    io.sockets.in(roomCode).emit('update players', { players: playerList.prepareToSend(), departingPlayer })
    io.sockets.in(roomCode).emit('need more players');

    if(playerList.length < 3) {
      // IF THE LOSS OF A PLAYER BRINGS THE PLAYER COUNT BELOW 3
      // clear out the player selections (they will get their cards back on the front end)
      this.playerSelections = [];
      console.log('PLAYER COUNT FELL BELOW 3, CHECKING FOR PENDING PLAYERS')
      // if there are pending players waiting to join the game...
      if (Object.keys(pending).length > 0) {
        // ...shove 'em all in and let other players know when each of them joins
        for (let id in pending) {
          console.log(`adding ${pending[id].name} to players`)
          let joiningPlayer = pending[id].name;
          this.addToRoom(pending[id].name, id);
          io.sockets.in(roomCode).emit('update players', { players: playerList.prepareToSend(), joiningPlayer })
          players[id].ready = true;
          let playerSocket = io.sockets.connected[id];
          playerSocket.emit('joined', { cards: [...players[id].cards] })
        }
      }
      // if there still aren't over 3 players...
      if (playerList.length < 3) {
        console.log('STILL LESS THAN THREE PLAYERS, WAITING FOR MORE') // ...tell everyone who's left that they need more players
        io.sockets.in(roomCode).emit('need more players');
        this.stage = 'waiting for ready'
        Object.values(players).forEach(player => { player.ready = true });
      } else {
        // ...even if there are now enough players, still need to reset the game
        this.startGame();
        io.sockets.in(roomCode).emit('start game', { 
          cardCzarName: this.currentCardCzar.name, 
          blackCard: this.currentBlackCard 
        })
      }
    } else {
      // ...IF THERE ARE STILL 3 OR MORE PLAYERS IN GAME...
      // ...if the departing player was the card czar and the game is not between rounds...
      if (id === this.currentCardCzar.id && this.stage !== 'waiting for ready') {
        // reset the game
        this.startGame();
        io.sockets.in(roomCode).emit('start game', {
          cardCzarName: this.currentCardCzar.name,
          blackCard: this.currentBlackCard
        })
      } else {
        // ...if the game is waiting for players to submit their white cards...
        if (this.stage === 'waiting for player submit') {
          console.log(`deleting ${departingPlayer}'s played cards`) // ...remove the departing player's selection(s)...
          let selectionIndex = playerSelections.findIndex((element) => { return element.id === id });
          playerSelections.splice(selectionIndex, 1)
        }
        // ...and send the played cards to the czar if the departing player was the last one
        if (playerSelections.length === playerList.length - 1) {
          let cardCzarSocket = io.sockets.connected[this.currentCardCzar.id];
          let playerSelectionsScrubbed = playerSelections.map((el) => {
            return el.selection;
          });

          this.stage = 'waiting for czar choice';

          if(cardCzarSocket) {
            cardCzarSocket.emit('czar chooses', { playerSelections: playerSelectionsScrubbed })
          }
        }
      }
    }
  }

  discardSelections() {
    this.playerSelections.forEach((el) => {
      el.selection.forEach((card) => {
        this.whiteDeck.discard.push(card);
      })
    })
    this.playerSelections = [];
  }

  startGame() {
    this.currentBlackCard = this.blackDeck.cards.pop();
    this.currentCardCzar = Object.values(this.playerList.players)[this.playerList.cardCzarIndex];
    this.stage = 'waiting for czar read';
    this.playerList.resetReady();
  }
}

class CardDeck {
  constructor(cards) {
    this.cards = this.shuffle(cards);
    this.discard = [];
  }

  shuffle(cards) {
    let shuffledCards = [];

    for(let i = 0; i < cards.length; i++) {
      let randIndex = Math.floor(Math.random() * cards.length);
      shuffledCards.push(cards.splice(randIndex, 1)[0]);
    };

    return shuffledCards;
  }

  reshuffle() {
    this.cards.concat(this.discard);
    this.cards = this.shuffle(this.cards);
  }

  get count() {
    return this.cards.length;
  }
}

class PlayerList {
  constructor(roomCode) {
    this.players = {};
    this.pending = {};
    this.roomCode = roomCode;
    this.cardCzarIndex = 0;
  }

  get length() {
    return Object.keys(this.players).length;
  }

  allReady() {
    for(let id in this.players) {
      if (!this.players[id].ready) {
        return false;
      }
    }
    return true;
  }

  resetReady() {
    for(let id in this.players) {
      this.players[id].ready = false;
    }
  }

  prepareToSend() {
    let playersPackaged = [];

    for (let id in this.players) {
      playersPackaged.push({
        name: this.players[id].name,
        id: id,
        ready: this.players[id].ready,
        winningCards: this.players[id].winningCards,
        score: this.players[id].score,
      });
    }

    return playersPackaged;
  }

  nextCardCzar() {
    if (this.cardCzarIndex + 1 === this.length) {
      this.cardCzarIndex = 0;
    } else {
      this.cardCzarIndex += 1;
    }
  }
}

class Player {
  constructor(name, id, roomCode) {
    this.name = name;
    this.id = id;
    this.roomCode = roomCode;
    this.cards = [];
    this.ready = false;
    this.winningCards = [];
  }

  get score() {
    return this.winningCards.length;
  }

  refillWhiteCards(whiteDeck) {
    console.log(`refilling ${this.name}'s white cards`);
    if (this.cards.length < 10) {
      for (let i = this.cards.length; i < 10; i++) {
        this.cards.push(whiteDeck.pop());
      }
    }
  }
}

io.on('connection', (socket) => {
  console.log(`${socket.id} connected`);

  socket.emit('connected');

  socket.on('create', (data) => {
    let roomCode;

    while(!roomCode || gameRooms[roomCode]) {
      roomCode = roomCodeGen();
    }

    console.log(`${data.name} has created a game, code ${roomCode}`);
    
    gameRooms[roomCode] = new GameRoom(roomCode);

    socket.join(roomCode);
    gameRooms[roomCode].addToRoom(data.name, socket.id);

    socket.emit('update players', {
      players: gameRooms[roomCode].playerList.prepareToSend(),
      joiningPlayer: data.name,
    });

    socket.emit('joined', {
      cards: [...gameRooms[roomCode].playerList.players[socket.id].cards],
      roomCode,
    });
    
  });

  socket.on('join', (data) => {
    let roomCode = data.roomCode.toUpperCase();

    if (gameRooms[roomCode]) {
      const { playerList, stage } = gameRooms[roomCode];
      const { players, pending, cardCzarIndex } = playerList;

      if (playerList.length < 10) {
        let nameExists = false;

        for(let id in players){
          if(players[id].name.toUpperCase() === data.name.toUpperCase()){
            nameExists = true
          }
        }

        if(!nameExists){
          socket.join(roomCode);
          if (stage === 'waiting for ready') {
            console.log(`game stage? ${stage}! welcome aboard ${roomCode}, ${data.name}!`)
            gameRooms[roomCode].addToRoom(data.name, socket.id);
            
            socket.emit('joined', {
              cards: [...players[socket.id].cards],
              roomCode,
            });
            
            io.sockets.in(roomCode).emit('update players', { 
              players: playerList.prepareToSend(), 
              joiningPlayer: data.name 
            });
          } else {
            console.log(`game stage? ${stage}! wait in line for ${roomCode}, ${data.name}`)
            pending[socket.id] = {
              name: data.name
            }
            socket.emit('game in progress', {
              roomCode,
              cardCzarName: Object.values(players)[cardCzarIndex].name
            });
          }
          
        } else {
          console.log(`${data.name} tried to join, name already exists`)
          socket.emit('name taken')
        }

      } else {
        console.log('Fuck off, we\'re full!');
        socket.emit('room full');
      }

    } else {
      socket.emit('bad roomcode');
    }
  });

  socket.on('player ready', (data) => {
    let roomCode = data.roomCode;
    let { playerList, blackDeck, stage } = gameRooms[roomCode];
    let { players, cardCzarIndex } = playerList;

    console.log(`${players[socket.id].name} is ready`);
    players[socket.id].ready = true;

    io.sockets.in(roomCode).emit('update players', { players: playerList.prepareToSend() });

    if (playerList.allReady()) {
      if (playerList.length >= 3) {
        gameRooms[roomCode].startGame();
        const { currentCardCzar, currentBlackCard } = gameRooms[roomCode];
        io.sockets.in(roomCode).emit('start game', { cardCzarName: currentCardCzar.name, blackCard: currentBlackCard });
        console.log(`everyone's ready! game stage? ${gameRooms[roomCode].stage}`)
      } else {
        socket.emit('need more players');
      }
    }
  });

  socket.on('czar ready', (data) => {
    gameRooms[data.roomCode].stage = 'waiting for player submit';
    socket.broadcast.to(data.roomCode).emit('pick your cards', {blackCard: data.blackCard});
  });

  socket.on('card submit', (data) => {
    let roomCode = data.roomCode;
    const { playerList, playerSelections, stage } = gameRooms[roomCode];
    const { players, cardCzarIndex } = playerList;
    const { cards } = players[socket.id];

    console.log(`${players[socket.id].name} submitted: ${data.cardSelection}`);
    data.cardSelection.forEach((card) => {
      cards.splice(cards.indexOf(card), 1);
    })

    playerSelections.push({
      name: players[socket.id].name,
      id: socket.id,
      selection: data.cardSelection,
    });

    io.sockets.in(roomCode).emit('player submitted', {playedCount: playerSelections.length});

    // if everyone (minus the card czar) has submitted their selections
    if (playerSelections.length === playerList.length - 1) {
      let cardCzarId = Object.values(players)[cardCzarIndex].id;
      let cardCzarSocket = io.sockets.connected[cardCzarId];
      let playerSelectionsScrubbed = playerSelections.map((el) => {
        return el.selection;
      })

      gameRooms[roomCode].stage = 'waiting for czar choice';

      if (cardCzarSocket) {
        console.log(`sending card czar: ${playerSelectionsScrubbed}`)
        cardCzarSocket.emit('czar chooses', {playerSelections: playerSelectionsScrubbed});
      }
    }
  })

  socket.on('czar has chosen', (data) => {
    let roomCode = data.roomCode;
    const { playerList, playerSelections, winningCards } = gameRooms[roomCode];
    const { players, pending } = playerList;
    let winner = {};

    console.log(`card czar chose ${data.czarChoice}`);

    playerSelections.forEach((el) => {
      if(el.selection[0] === data.czarChoice[0]) {
        winner.id = el.id;
        winner.name = el.name;
        if(players[el.id]) {
          players[el.id].winningCards.push({black: data.blackCard, white: data.czarChoice})
        }
      }
    })

    winningCards.push({
      black: data.blackCard,
      white: data.czarChoice,
      name: winner.name,
    })

    gameRooms[roomCode].stage = 'waiting for ready';

    io.sockets.in(roomCode).emit('update players', { players: playerList.prepareToSend() });
    io.sockets.in(roomCode).emit('a winner is', { winner, winningCards });

    // after card czar chooses, bring pending players into the game
    for (let id in pending) {
      gameRooms[roomCode].addToRoom(pending[id].name, id);
      players[id].ready = true;
      let playerSocket = io.sockets.connected[id];
      playerSocket.emit('joined', {
        cards: [...players[id].cards],
        roomCode,
      });
      io.sockets.in(roomCode).emit('update players', { 
        players: playerList.prepareToSend(),
        joiningPlayer: pending[id].name,
      });
      delete pending[id];
    }

  })

  socket.on('next round', (data) => {
    let roomCode = data.roomCode;
    const { playerList, whiteDeck } = gameRooms[roomCode];
    const { players } = playerList;

    players[socket.id].ready = true;
    players[socket.id].refillWhiteCards(whiteDeck.cards);
    socket.emit('refill white cards', { cards: players[socket.id].cards });

    if (playerList.allReady()) {
      console.log('on to the next round!');
      gameRooms[roomCode].discardSelections();
      if(whiteDeck.cards.length < 20) {
        whiteDeck.reshuffle();
      }
      playerList.nextCardCzar();
      gameRooms[roomCode].startGame();
      const { currentCardCzar, currentBlackCard } = gameRooms[roomCode];
      io.sockets.in(roomCode).emit('start game', { cardCzarName: currentCardCzar.name, blackCard: currentBlackCard });
    }
  })

  socket.on('leave game', (data) => {
    let roomCode = data.roomCode;
    let { players } = gameRooms[roomCode].playerList;
    console.log(`${players[socket.id].name} left room ${roomCode}`);

    if (players[socket.id]) {
      socket.leave(roomCode);
      gameRooms[roomCode].removeFromRoom(socket.id);
    }
  })

  socket.on('disconnect', () => {
    console.log(socket.id + ' disconnected')
    for (let roomCode in gameRooms) {
      let { players } = gameRooms[roomCode].playerList;

      if (players[socket.id]) {
        socket.leave(roomCode);
        gameRooms[roomCode].removeFromRoom(socket.id);
      }
    }
  })


  // **
  // FUNCTIONS BELOW
  // **

  // generates a random 5-digit alphanumeric room code for players to join
  function roomCodeGen() {
    let roomCode = '';
    let charBank = 'abcdefghijklmnpqrstuvwxyz123456789';

    for(let i = 0; i < 5; i++){
      roomCode += charBank.charAt(Math.floor(Math.random() * charBank.length));
    }

    return roomCode.toUpperCase();
  }

  // when a player joins, puts together a player object for them and adds them to a room
  function joinPlayerToRoom(id, name, roomCode) {
    const { players, czarOrder } = gameRooms[roomCode];

    let player = {
      name,
      cards: refillWhiteCards(roomCode),
      ready: false,
      winningCards: [],
    }

    players[id] = player;
    czarOrder.push({id: id, name: player.name});

    let playersList = preparePlayerListToSend(roomCode);
    io.sockets.in(roomCode).emit('update players', { players: playersList, joiningPlayer: player.name });

  }

  function removePlayerFromRoom(roomCode, id) {
    const { players, playedCards, pendingPlayers, czarOrder, gameStage } = gameRooms[roomCode];

    console.log(`${players[id].name} left room ${roomCode}`);

    // delete player from players object and update players' lists
    let departingPlayer = players[id].name;
    delete players[id];
    let playersList = preparePlayerListToSend(roomCode);
    io.sockets.in(roomCode).emit('update players', { players: playersList, departingPlayer });

    if (Object.keys(players).length < 3) { 
      // IF THE LOSS OF A PLAYER BRINGS THE PLAYER COUNT BELOW 3
      console.log('PLAYER COUNT DROPPED BELOW 3...')
      for(let id in playedCards) {
        delete playedCards[id];
      }

      // if there are pending players waiting to join the game...
      console.log('CHECKING FOR PENDING PLAYERS')
      if (Object.keys(pendingPlayers).length > 0) {
        // ...shove in all the pending players
        for (let id in pendingPlayers) {
          console.log(`adding ${pendingPlayers[id].name} to players`)

          joinPlayerToRoom(id, pendingPlayers[id].name, roomCode);
          
          players[id].ready = true;
          
          let playerSocket = io.sockets.connected[id];
          playerSocket.emit('joined', {
            cards: [...players[id].cards],
            roomCode,
          });

          delete pendingPlayers[id];
        }
        // send updated player list to players
        let playersList = preparePlayerListToSend(roomCode);
        io.sockets.in(roomCode).emit('update players', { players: playersList });
      }
      
      // if there still aren't enough players...
      if (Object.keys(players).length < 3) {
        console.log('STILL LESS THAN THREE PLAYERS')
        io.sockets.in(roomCode).emit('need more players');
        gameRooms[roomCode].gameStage = 'waiting for ready';
        for (let id in players) {
          players[id].ready = true;
        }
      } else {
        // ...else, even if there are enough players, still need to reset the game

        // if the next person in the czar order is the departing player, go ahead and remove them now
        // (because resetGame() cycles to the next card czar)
        if (czarOrder[1].id === id) {
          czarOrder.splice(findById(czarOrder, id), 1);
        } 
        
        resetGame(roomCode);
      }

    } else {
      // ...ELSE IF THERE ARE STILL 3 OR MORE PLAYERS IN THE GAME...
      // ...if the departing player was the card czar...
      if (czarOrder[0].id === id && gameStage !== 'waiting for ready') {
        // reset the game (cycles to next czar)
        resetGame(roomCode);
      } else {
        // ...else, if the game is waiting for players to submit their white cards
        if (gameStage === 'waiting for player submit') {
          // ...remove the departing players' played cards...
          if (playedCards[id]) {
            console.log(`deleting ${id}'s played cards`);
            delete playedCards[id];
          }
          // ...and send the played cards to the czar if the departing player was the last one
          let allPlayersSubmitted = (Object.keys(playedCards).length === Object.keys(players).length - 1);
          if (allPlayersSubmitted) {
            sendWhiteCardsToCardCzar(roomCode);
          }
        }
      } 
    }
    // okay, after all that, finally remove the departing player from the czar order array
    czarOrder.splice(findById(czarOrder, id), 1);
  }

  function preparePlayerListToSend(roomCode) {
    const { players } = gameRooms[roomCode];
    let playersPackaged = [];

    for (let id in players) {
      playersPackaged.push({
        name: players[id].name,
        id: id,
        ready: players[id].ready,
        winningCards: players[id].winningCards,
      });
    }

    return playersPackaged;
  }

  function sendWhiteCardsToCardCzar(roomCode) {
    const { playedCards, czarOrder } = gameRooms[roomCode];

    let cardCzarSocket = io.sockets.connected[czarOrder[0].id];
    let playerSelections = [];

    for (let id in playedCards) {
      playerSelections.push(playedCards[id]);
    }

    gameRooms[roomCode].gameStage = 'waiting for czar choice';

    if (cardCzarSocket) {
      console.log(`sending card czar: ${playerSelections}`)
      cardCzarSocket.emit('czar chooses', {playerSelections: playerSelections});
    }
  }

  function shuffleCards(cards) {
    let shuffledCards = [];

    for(let i = 0; i < cards.length; i++) {
      randIndex = Math.floor(Math.random() * cards.length);
      shuffledCards.push(cards.splice(randIndex, 1)[0]);
    };

    return shuffledCards;
  }

  function refillWhiteCards(roomCode, playerCards = []) {
    const { whiteCards } = gameRooms[roomCode];

    if (playerCards.length < 10) {
      for(let i = playerCards.length; i < 10; i++) {
        let whiteCard = whiteCards.pop()
        playerCards.push(whiteCard);
      }
    }

    return playerCards;
  }

  function checkIfAllPlayersReady(roomCode) {
    const { players } = gameRooms[roomCode];

    for (let id in players) {
      if (!players[id].ready) {
        return false;
      }
    }

    return true;
  }

  function startGame(roomCode) {
    const { players, blackCards, czarOrder } = gameRooms[roomCode];

    let blackCard = blackCards.pop();
    let cardCzar = czarOrder[0];
    let cardCzarSocket = io.sockets.connected[cardCzar.id];

    io.sockets.in(roomCode).emit('start game', {cardCzarName: cardCzar.name, blackCard});

    for (let id in players) {
      players[id].ready = false;
    }

    gameRooms[roomCode].gameStage = 'waiting for czar read';
  }

  function resetGame(roomCode) {
    console.log('all players ready, resetting game');
    const { 
      playedCards, 
      players, 
      czarOrder, 
      whiteCards,
      blackCards, 
      whiteCardDiscard,
    } = gameRooms[roomCode];

    console.log('cycling czar order');
    let prevCzar = czarOrder.shift();
    czarOrder.push(prevCzar);

    console.log('dumping played cards into discard');
    for (let id in playedCards) {
      playedCards[id].selection.forEach((card) => {
        whiteCardDiscard.push(card);
      });
      delete playedCards[id];
    }

    startGame(roomCode);
    
  }

  function findById(arrayOfObjects, id) {
    for (let i = 0; i < arrayOfObjects.length; i++) {
      if (arrayOfObjects[i].id === id) {
        return i;
      }
    }
  }
})