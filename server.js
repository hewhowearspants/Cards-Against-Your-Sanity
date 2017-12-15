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
      const { players, pendingPlayers, gameInProgress } = gameRooms[roomCode];

      if (Object.keys(players).length < 10) {

        socket.join(roomCode);
        if (!gameInProgress) {
          joinPlayerToRoom(socket.id, data.name, roomCode);
          socket.emit('joined', {
            cards: [...players[socket.id].cards],
            roomCode,
          });
        } else {
          pendingPlayers[socket.id] = {
            name: data.name
          }
          socket.emit('game in progress');
        }

        console.log(`${data.name} has joined game ${roomCode}`);
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
    const { players, blackCards, czarOrder, gameInProgress } = gameRooms[roomCode];

    console.log(`${players[socket.id].name} is ready`);
    players[socket.id].ready = true;

    let playersList = preparePlayerListToSend(roomCode);
    io.sockets.in(roomCode).emit('update players', { players: playersList });

    if (checkIfAllPlayersReady(roomCode)) {
      gameInProgress = true;
      startGame(roomCode);
    }
  });

  socket.on('czar ready', (data) => {
    socket.broadcast.to(data.roomCode).emit('pick your cards', {blackCard: data.blackCard});
  });

  socket.on('card submit', (data) => {
    let roomCode = data.roomCode;
    const { players, playedCards, czarOrder, gameInProgress } = gameRooms[roomCode];
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

      if (cardCzarSocket) {
        console.log(`sending card czar: ${playerSelections}`)
        cardCzarSocket.emit('czar chooses', {playerSelections: playerSelections});
      }
    }
  })

  socket.on('czar has chosen', (data) => {
    let roomCode = data.roomCode;
    const { players, pendingPlayers, playedCards, winningCards, gameInProgress } = gameRooms[roomCode];
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

    gameInProgress = false;

    let playersList = preparePlayerListToSend(roomCode);
    console.log(`The scores so far: `);
    playersList.forEach((player) => { 
      console.log(`${player.name}: ${player.winningCards.length}`);
    })
    io.sockets.in(roomCode).emit('update players', { players: playersList });
    io.sockets.in(roomCode).emit('a winner is', { winner, winningCards });

    for (let id in pendingPlayers) {
      joinPlayerToRoom(id, pendingPlayers[id].name, roomCode);
      socket.emit('joined', {
        cards: [...players[id].cards],
        roomCode,
      });
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
    removePlayerFromRoom(data.roomCode, socket.id);
  })

  socket.on('disconnect', () => {
    console.log(socket.id + ' disconnected')
    for (let roomCode in gameRooms) {
      removePlayerFromRoom(roomCode, socket.id);
    }
  })
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

// when a player joins, puts together a player object for them and adds them
// to a room
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
  io.sockets.in(roomCode).emit('update players', { players: playersList });

}

function removePlayerFromRoom(roomCode, id) {
  const { players, playedCards, czarOrder } = gameRooms[roomCode];

  if (players[id]) {
    console.log(`${players[id].name} left room ${roomCode}`);

    delete players[id];

    let playersList = preparePlayerListToSend(roomCode);
    io.sockets.in(roomCode).emit('update players', { players: playersList });
  }

  if (playedCards[id]) {
    console.log(`deleting ${id}'s played cards`);
    delete playedCards[id];
  }

  if (czarOrder[findById(czarOrder, id)]) {
    console.log(`removing ${id} from czarOrder`);
    czarOrder.splice(findById(czarOrder, id));
  }
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