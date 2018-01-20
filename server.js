const express = require('express');
const logger = require('morgan');
const path = require('path');
const cards = require('./cards.js');

const app = express();

const server = require('http').createServer(app);

app.use(logger('dev'));
app.use(express.static(`${__dirname}/public`));

const port = process.env.PORT || 3001;

server.listen(port, function() {
  console.log(`Horrible people listen to ${port}`);
});

const io = require('socket.io')(server);

const gameRooms = {};

io.on('connection', (socket) => {
  console.log(`${socket.id} connected`);

  socket.emit('connected');

  socket.on('create', (data) => {
    let roomCode = roomCodeGen();

    console.log(`${data.name} has created a game, code ${roomCode}`);
    
    gameRooms[roomCode] = {
      players: {},
      pendingPlayers: {},
      czarOrder: [],
      playedCards: {},
      blackCards: shuffleCards([...cards.blackCards]),
      whiteCards: shuffleCards([...cards.whiteCards]),
      blackCardDiscard: [],
      whiteCardDiscard: [],
      winningCards: [],
      gameStage: 'waiting for ready',
    };

    socket.join(roomCode);

    joinPlayerToRoom(socket.id, data.name, roomCode);

    socket.emit('joined', {
      cards: [...gameRooms[roomCode].players[socket.id].cards],
      roomCode,
    });
    
  });

  socket.on('join', (data) => {
    let roomCode = data.roomCode.toUpperCase();

    if (gameRooms[roomCode]) {
      const { players, pendingPlayers, gameStage, czarOrder } = gameRooms[roomCode];

      if (Object.keys(players).length < 10) {
        let nameExists = false;

        for(let id in players){
          if(players[id].name.toUpperCase() === data.name.toUpperCase()){
            nameExists = true
          }
        }

        if(!nameExists){
          socket.join(roomCode);
          if (gameStage === 'waiting for ready') {
            console.log(`game stage? ${gameStage}! welcome aboard ${roomCode}, ${data.name}!`)
            joinPlayerToRoom(socket.id, data.name, roomCode);
            socket.emit('joined', {
              cards: [...players[socket.id].cards],
              roomCode,
            });
          } else {
            console.log(`game stage? ${gameStage}! wait in line for ${roomCode}, ${data.name}`)
            pendingPlayers[socket.id] = {
              name: data.name
            }
            let playersList = preparePlayerListToSend(roomCode);
            socket.emit('update players', { players: playersList });
            socket.emit('game in progress', {
              roomCode,
              cardCzarName: czarOrder[0].name
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
    let { players, blackCards, czarOrder, gameStage } = gameRooms[roomCode];

    console.log(`${players[socket.id].name} is ready`);
    players[socket.id].ready = true;

    let playersList = preparePlayerListToSend(roomCode);
    io.sockets.in(roomCode).emit('update players', { players: playersList });

    if (checkIfAllPlayersReady(roomCode)) {
      if (Object.keys(players).length >= 3) {
        gameRooms[roomCode].gameStage = 'waiting for czar read';
        startGame(roomCode);
        console.log(`everyone's ready! game stage? ${gameRooms[roomCode].gameStage}`)
      } else {
        socket.emit('need more players');
      }
    }
  });

  socket.on('czar ready', (data) => {
    gameRooms[data.roomCode].gameStage = 'waiting for player submit';
    socket.broadcast.to(data.roomCode).emit('pick your cards', {blackCard: data.blackCard});
  });

  socket.on('card submit', (data) => {
    let roomCode = data.roomCode;
    const { players, playedCards, czarOrder, gameStage } = gameRooms[roomCode];
    const { cards } = players[socket.id];

    console.log(`${players[socket.id].name} submitted: ${data.cardSelection}`);
    data.cardSelection.forEach((card) => {
      cards.splice(cards.indexOf(card), 1);
    })

    playedCards[socket.id] = data.cardSelection;

    io.sockets.in(roomCode).emit('player submitted', {playedCount: Object.keys(playedCards).length});

    if (Object.keys(playedCards).length === Object.keys(players).length - 1) {
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
  })

  socket.on('czar has chosen', (data) => {
    let roomCode = data.roomCode;
    const { players, pendingPlayers, playedCards, winningCards } = gameRooms[roomCode];
    let winner = {};

    console.log(`card czar chose ${data.czarChoice}`);

    for (let id in playedCards) {
      if (playedCards[id][0] === data.czarChoice[0]) {
        winner.id = id;
        winner.name = players[id].name;
        players[id].winningCards.push({black: data.blackCard, white: data.czarChoice})
      }
    }

    winningCards.push({
      black: data.blackCard,
      white: data.czarChoice,
      name: winner.name,
    })

    gameRooms[roomCode].gameStage = 'waiting for ready';

    let playersList = preparePlayerListToSend(roomCode);
    console.log(`The scores so far: `);
    playersList.forEach((player) => { 
      console.log(`${player.name}: ${player.winningCards.length}`);
    })
    io.sockets.in(roomCode).emit('update players', { players: playersList });
    io.sockets.in(roomCode).emit('a winner is', { winner, winningCards });

    for (let id in pendingPlayers) {
      joinPlayerToRoom(id, pendingPlayers[id].name, roomCode);
      players[id].ready = true;
      let playerSocket = io.sockets.connected[id];
      playerSocket.emit('joined', {
        cards: [...players[id].cards],
        roomCode,
      });
      delete pendingPlayers[id];
    }

  })

  socket.on('next round', (data) => {
    let roomCode = data.roomCode;
    const { players } = gameRooms[roomCode];

    players[socket.id].ready = true;
    players[socket.id].cards = refillWhiteCards(roomCode, players[socket.id].cards);
    socket.emit('refill white cards', { cards: players[socket.id].cards });

    if (checkIfAllPlayersReady(roomCode)) {
      console.log('on to the next round!');
      resetGame(roomCode);
    }
  })

  socket.on('leave game', (data) => {
    const { players } = gameRooms[data.roomCode];
    console.log(`${players[socket.id].name} left the game`);
    if (players[socket.id]) {
      socket.leave(data.roomCode);
      removePlayerFromRoom(data.roomCode, socket.id);
    }
  })

  socket.on('disconnect', () => {
    console.log(socket.id + ' disconnected')
    for (let roomCode in gameRooms) {
      if (gameRooms[roomCode].players[socket.id]) {
        socket.leave(roomCode);
        removePlayerFromRoom(roomCode, socket.id);
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
      for(let card in playedCards) {
        delete playedCards[card];
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
      if (czarOrder[0].id === id) {
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

    io.sockets.in(roomCode).emit('start game', {cardCzarName: cardCzar.name});

    if (cardCzarSocket) {
      cardCzarSocket.emit('card czar', {blackCard: blackCard});
    }

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
      playedCards[id].forEach((card) => {
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