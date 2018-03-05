const express = require('express');
const logger = require('morgan');
const path = require('path');

const app = express();

const server = require('http').createServer(app);

// keep the heroku app awake!!
// setInterval(function() {
//   require('http').get('http://cardsagainstyoursanity.herokuapp.com');
// }, 300000);

app.use(logger('dev'));
app.use(express.static(`${__dirname}/public`));

const port = process.env.PORT || 3001;

server.listen(port, function() {
  console.log(`Horrible people listen to ${port}`);
});

const io = require('socket.io')(server);
const cards = require('./cards.js');

const gameRooms = {};

// ***
// CLASSES BELOW
// - classes contain all game data and methods pertaining to their category
// - they chiefly only handle the game data and not the socket interactions
// - the only exception is GameRoom's removeFromRoom, due to its complexity
// ***

class GameRoom {
  // GameRoom contains data and methods pertaining to the game room
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
  
  // adds a player to the room
  addToRoom(name, id) {
    this.playerList.players[id] = new Player(name, id, this.roomCode);
    this.playerList.players[id].refillWhiteCards(this.whiteDeck.cards);
  }

  // removes a player from the room
  // long and complicated due to handling of edge cases
  removeFromRoom(id) {
    const { roomCode, playerList, playerSelections } = this;
    const { players, pending } = playerList;

    // delete player from playerList and let other players know someone left
    let departingPlayer = players[id].name;
    console.log(`${departingPlayer} left room ${roomCode}`);
    delete players[id];
    io.sockets.in(roomCode).emit('update players', { players: playerList.prepareToSend(), departingPlayer })

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
          if (selectionIndex >= 0) { playerSelections.splice(selectionIndex, 1) }
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

  // takes player selections and puts them into the discard
  // this is important because discard must be emptied back into whiteDeck for reshuffle
  discardSelections() {
    this.playerSelections.forEach((el) => {
      el.selection.forEach((card) => {
        this.whiteDeck.discard.push(card);
      })
    })
    this.playerSelections = [];
  }

  // sets current black card, card czar, game stage, and resets players' ready status
  startGame() {
    this.currentBlackCard = this.blackDeck.cards.pop();
    this.currentCardCzar = Object.values(this.playerList.players)[this.playerList.cardCzarIndex];
    this.stage = 'waiting for czar read';
    this.playerList.resetReady();
  }
}

class CardDeck {
  // CardDeck contains all data and methods pertaining to a card deck, irrespective of color
  constructor(cards) {
    this.cards = this.shuffle(cards);
    this.discard = [];
  }

  // does what it says
  shuffle(cards) {
    let shuffledCards = [];

    for(let i = 0; i < cards.length; i++) {
      let randIndex = Math.floor(Math.random() * cards.length);
      shuffledCards.push(cards.splice(randIndex, 1)[0]);
    };

    return shuffledCards;
  }

  // dumps discard into cards, shuffles cards
  reshuffle() {
    this.cards.concat(this.discard);
    this.cards = this.shuffle(this.cards);
  }

  // getter so I only need to type 'whiteDeck.count' instead of 'whiteDeck.cards.length'
  get count() {
    return this.cards.length;
  }
}

class PlayerList {
  // PlayerList handles all data and methods pertaining to the list of players,
  // both active and pending
  constructor(roomCode) {
    this.players = {};
    this.pending = {};
    this.roomCode = roomCode;
    this.cardCzarIndex = 0;
  }

  // getter so I only need to type 'playerList.length' instead of...well, just look at it VVVV
  get length() {
    return Object.keys(this.players).length;
  }

  // returns whether or not all players are ready
  allReady() {
    for(let id in this.players) {
      if (!this.players[id].ready) {
        return false;
      }
    }
    return true;
  }

  // resets all players' ready status to false
  resetReady() {
    for(let id in this.players) {
      this.players[id].ready = false;
    }
  }

  // scrubs the player list of card data and converts to array for sending out to players
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

  // iterates cardCzarIndex, loops back to zero if reaches the end of the player list
  nextCardCzar() {
    if (this.cardCzarIndex + 1 === this.length) {
      this.cardCzarIndex = 0;
    } else {
      this.cardCzarIndex += 1;
    }
  }
}

class Player {
  // Player contains all data and methods pertaining to each individual player
  constructor(name, id, roomCode) {
    this.name = name;
    this.id = id;
    this.roomCode = roomCode;
    this.cards = [];
    this.ready = false;
    this.winningCards = [];
  }

  // getter so I only need to type player.score instead of player.winningCards.length
  get score() {
    return this.winningCards.length;
  }

  // tops off the players white cards back to 10, requires whiteDeck as parameter
  refillWhiteCards(whiteDeck) {
    console.log(`refilling ${this.name}'s white cards`);
    if (this.cards.length < 10) {
      for (let i = this.cards.length; i < 10; i++) {
        this.cards.push(whiteDeck.pop());
      }
    }
  }
}

// ***
// SOCKET EVENTS BELOW
// ***

io.on('connection', (socket) => {
  console.log(`${socket.id} connected`);

  socket.emit('connected');

  // 'create' generates a new room code and adds the player to it
  socket.on('create', (data) => {
    let roomCode;

    // ensures that the roomCode generated is unique and not currently in use
    while(!roomCode || gameRooms[roomCode]) {
      roomCode = roomCodeGen();
    }

    console.log(`${data.name} has created a game, code ${roomCode}`);
    
    // creates new GameRoom instance
    gameRooms[roomCode] = new GameRoom(roomCode);

    // joins the player to the GameRoom they created
    socket.join(roomCode);
    gameRooms[roomCode].addToRoom(data.name, socket.id);

    // updates the players playerList
    socket.emit('update players', {
      players: gameRooms[roomCode].playerList.prepareToSend(),
      joiningPlayer: data.name,
    });

    // gives the player their cards
    socket.emit('joined', {
      cards: [...gameRooms[roomCode].playerList.players[socket.id].cards],
      roomCode,
    });
    
  });

  // 'join' essentially does the same thing as 'create' as it relates to joining to a room
  // has extra logic to prevent duplicate names or more than 10 players
  socket.on('join', (data) => {
    let roomCode = data.roomCode.toUpperCase();

    // if there is a room to join...(basically if they typed the right code)
    if (gameRooms[roomCode]) {
      const { playerList, stage } = gameRooms[roomCode];
      const { players, pending, cardCzarIndex } = playerList;

      // if there aren't already 10 players in the room...
      if (playerList.length < 10) {
        let nameExists = false;

        // this checks to see if someone else has the same name as the joining player
        for(let id in players){
          if(players[id].name.toUpperCase() === data.name.toUpperCase()){
            nameExists = true
          }
        }

        // if nobody else has the same name...
        if(!nameExists){

          socket.join(roomCode);

          // if there is not currently a round in progress...
          if (stage === 'waiting for ready') {
            console.log(`game stage? ${stage}! welcome aboard ${roomCode}, ${data.name}!`)
            gameRooms[roomCode].addToRoom(data.name, socket.id);
            
            // join the player to the room
            socket.emit('joined', {
              cards: [...players[socket.id].cards],
              roomCode,
            });
            
            io.sockets.in(roomCode).emit('update players', { 
              players: playerList.prepareToSend(), 
              joiningPlayer: data.name 
            });
          } else {
            // ...otherwise put the joining player into pending for now
            console.log(`game stage? ${stage}! wait in line for ${roomCode}, ${data.name}`)
            pending[socket.id] = {
              name: data.name
            }
            // informs joining player that there is a round in progress
            socket.emit('game in progress', {
              roomCode,
              cardCzarName: Object.values(players)[cardCzarIndex].name
            });
          }
          
        } else {
          // informs the joining player that the name they chose is taken
          console.log(`${data.name} tried to join, name already exists`)
          socket.emit('name taken')
        }

      } else {
        // room's full
        console.log('Fuck off, we\'re full!');
        socket.emit('room full');
      }

    } else {
      // no gameroom exists for that room code
      socket.emit('bad roomcode');
    }
  });

  // 'player ready' is the player telling the server they are ready for the game to start
  // or the next round
  socket.on('player ready', (data) => {
    let roomCode = data.roomCode;
    let { playerList, blackDeck, stage } = gameRooms[roomCode];
    let { players, cardCzarIndex } = playerList;

    console.log(`${players[socket.id].name} is ready`);
    players[socket.id].ready = true;

    // updates players to reflect ready status
    io.sockets.in(roomCode).emit('update players', { players: playerList.prepareToSend() });

    // if all players are ready...
    if (playerList.allReady()) {
      // ...and there are at least 3 players...
      if (playerList.length >= 3) {
        // set current black card and card czar
        gameRooms[roomCode].startGame();
        const { currentCardCzar, currentBlackCard } = gameRooms[roomCode];
        // sends black card and card czar to players and starts the game
        io.sockets.in(roomCode).emit('start game', { cardCzarName: currentCardCzar.name, blackCard: currentBlackCard });
        console.log(`everyone's ready! game stage? ${gameRooms[roomCode].stage}`)
      } else {
        // ...informs players that they need more players
        io.sockets.in(roomCode).emit('need more players');
      }
    }
  });

  // 'czar ready' tells the server that the card czar has read their black card to the
  // rest of the players and sends the black card to the players so they can pick their
  // white card(s)
  socket.on('czar ready', (data) => {
    gameRooms[data.roomCode].stage = 'waiting for player submit';
    socket.broadcast.to(data.roomCode).emit('pick your cards', {blackCard: data.blackCard});
  });

  // 'card submit' is a player sending their white card selection(s) to the server
  socket.on('card submit', (data) => {
    let roomCode = data.roomCode;
    const { playerList, playerSelections, stage } = gameRooms[roomCode];
    const { players, cardCzarIndex } = playerList;
    const { cards } = players[socket.id];

    console.log(`${players[socket.id].name} submitted: ${data.cardSelection}`);
    // removes the cards from the players hand on the server side
    data.cardSelection.forEach((card) => {
      cards.splice(cards.indexOf(card), 1);
    })

    playerSelections.push({
      name: players[socket.id].name,
      id: socket.id,
      selection: data.cardSelection,
    });

    // 'player submitted' updates players on the number of players who have submitted
    io.sockets.in(roomCode).emit('player submitted', {playedCount: playerSelections.length});

    // if everyone (minus the card czar obvs) has submitted their selections...
    if (playerSelections.length === playerList.length - 1) {
      let cardCzarId = Object.values(players)[cardCzarIndex].id;
      let cardCzarSocket = io.sockets.connected[cardCzarId];

      // ...removes names and ids from the player selections
      let playerSelectionsScrubbed = playerSelections.map((el) => {
        return el.selection;
      })

      gameRooms[roomCode].stage = 'waiting for czar choice';

      // ...sends the white card selections to the card czar
      if (cardCzarSocket) {
        console.log(`sending card czar: ${playerSelectionsScrubbed}`)
        cardCzarSocket.emit('czar chooses', {playerSelections: playerSelectionsScrubbed});
      }
    }
  })

  // 'czar has chosen' is the card czar indicating which of the player selections they have chosen
  // and letting the players know
  socket.on('czar has chosen', (data) => {
    let roomCode = data.roomCode;
    const { playerList, playerSelections, winningCards } = gameRooms[roomCode];
    const { players, pending } = playerList;
    let winner = {};

    console.log(`card czar chose ${data.czarChoice}`);

    // goes through playerSelections and assigns winner if there is a match
    playerSelections.forEach((el) => {
      if(el.selection[0] === data.czarChoice[0]) {
        winner.id = el.id;
        winner.name = el.name;
        if(players[el.id]) {
          players[el.id].winningCards.push({black: data.blackCard, white: data.czarChoice})
        }
      }
    })

    // adds winning selection to winningCards
    winningCards.push({
      black: data.blackCard,
      white: data.czarChoice,
      name: winner.name,
    })

    // round is over!
    gameRooms[roomCode].stage = 'waiting for ready';

    // updates players on who won
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

  // 'next round' is another take on 'player ready'
  // (COULD POSSIBLY BE MERGED)
  socket.on('next round', (data) => {
    let roomCode = data.roomCode;
    const { playerList, whiteDeck } = gameRooms[roomCode];
    const { players } = playerList;

    // 
    players[socket.id].ready = true;
    players[socket.id].refillWhiteCards(whiteDeck.cards);
    socket.emit('refill white cards', { cards: players[socket.id].cards });

    // if everyone is ready...
    if (playerList.allReady()) {
      console.log('on to the next round!');
      gameRooms[roomCode].discardSelections();
      // reshuffles whiteDeck if it has gone below 20 cards
      if(whiteDeck.count < 20) {
        whiteDeck.reshuffle();
      }
      playerList.nextCardCzar();
      gameRooms[roomCode].startGame();
      const { currentCardCzar, currentBlackCard } = gameRooms[roomCode];
      io.sockets.in(roomCode).emit('start game', { cardCzarName: currentCardCzar.name, blackCard: currentBlackCard });
    }
  })

  // 'leave game' is the player choosing to leave the current game room
  socket.on('leave game', (data) => {
    let roomCode = data.roomCode;
    let { players } = gameRooms[roomCode].playerList;
    console.log(`${players[socket.id].name} left room ${roomCode}`);

    if (players[socket.id]) {
      socket.leave(roomCode);
      gameRooms[roomCode].removeFromRoom(socket.id);
    }
  })

  // 'disconnect' is just like 'leave game', but a little more...abrupt
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
    let charBank = 'abcdefghijklmnpqrstuvwxyz';

    for(let i = 0; i < 5; i++){
      roomCode += charBank.charAt(Math.floor(Math.random() * charBank.length));
    }

    return roomCode.toUpperCase();
  }

})