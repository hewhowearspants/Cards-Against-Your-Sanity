const express = require('express');
const logger = require('morgan');
const path = require('path');
const cards = require('./cards.js');

const app = express();

const server = require('http').createServer(app);
const io = require('socket.io')(server);

app.use(logger('dev'));
app.use(express.static(__dirname + '/public'));

const gameRooms = {};

io.on('connection', (socket) => {
  console.log(socket.id + ' connected');

  socket.on('create', (data) => {
    let roomCode = roomCodeGen();

    console.log(data.name + ' has created a game, code ' + roomCode);

    gameRooms[roomCode] = {
      players: {},
      czarOrder: [],
      playedCards: [],
      blackCards: shuffleCards([...cards.blackCards]),
      whiteCards: shuffleCards([...cards.whiteCards]),
      blackCardDiscard: [],
      whiteCardDiscard: [],
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
      if (Object.keys(gameRooms[roomCode].players).length < 10) {

        socket.join(roomCode);
        joinPlayerToRoom(socket.id, data.name, roomCode);
        socket.emit('joined', {
          cards: [...gameRooms[roomCode].players[socket.id].cards],
          roomCode,
        });

        console.log(data.name + ' has joined game ' + roomCode);
      } else {
        console.log("Fuck off, we're full!");
        socket.emit('room full');
      }
    } else {
      socket.emit('bad roomcode');
    }
  });

  socket.on('player ready', (data) => {
    let roomCode = data.roomCode;

    console.log(gameRooms[roomCode].players[socket.id].name + ' is ready');
    gameRooms[roomCode].players[socket.id].ready = true;

    let players = preparePlayerListToSend(roomCode);
    io.sockets.in(roomCode).emit('update players', {players: players});

    if (checkIfAllPlayersReady(roomCode)) {
      let blackCard = gameRooms[roomCode].blackCards.pop();
      let czarTurn = gameRooms[roomCode].czarOrder[0];
      let czarTurnSocket = io.sockets.connected[czarTurn.id];

      if (czarTurnSocket) {
        czarTurnSocket.emit('card czar', {blackCard: blackCard});
      }

      console.log('all players ready, starting game');
      console.log(czarTurn.name + ' is the card czar');

      io.sockets.in(roomCode).emit('start game', {cardCzarName: czarTurn.name});
      socket.to(czarTurn.id).emit('card czar', {blackCard: blackCard});
    }
  })

  socket.on('disconnect', () => {
    for (let roomCode in gameRooms) {
      if (gameRooms[roomCode].players[socket.id]) {
        console.log(gameRooms[roomCode].players[socket.id].name + ' disconnected');

        delete gameRooms[roomCode].players[socket.id];

        let players = preparePlayerListToSend(roomCode);
        io.sockets.in(roomCode).emit('update players', {players: players});
      }
    }
  })
})

// generates a random 5-digit alphanumeric room code for players to join
function roomCodeGen() {
  let roomCode = '';
  let charBank = 'abcdefghijklmnopqrstuvwxyz0123456789';

  for(let i = 0; i < 5; i++){
    roomCode += charBank.charAt(Math.floor(Math.random() * charBank.length));
  }

  return roomCode.toUpperCase();
}

function joinPlayerToRoom(id, name, roomCode) {
  let player = {
    name,
    cards: initialDeal(roomCode),
    ready: false,
    winningCards: [],
  }

  gameRooms[roomCode].players[id] = player;
  gameRooms[roomCode].czarOrder.push({id: id, name: player.name});
  console.log(gameRooms[roomCode].czarOrder);

  let players = preparePlayerListToSend(roomCode);

  io.sockets.in(roomCode).emit('update players', {players: players});

}

function shuffleCards(cards) {
  let shuffledCards = [];

  for(let i = 0; i < cards.length; i++) {
    randIndex = Math.floor(Math.random() * cards.length);
    shuffledCards.push(cards.splice(randIndex, 1)[0]);
  };

  return shuffledCards;
}

function initialDeal(roomCode) {
  let cards = [];

  for(let i = 0; i < 10; i++) {
    let card = gameRooms[roomCode].whiteCards.pop();
    cards.push(card);
  }

  return cards;
}

function preparePlayerListToSend(roomCode) {
  let players = gameRooms[roomCode].players;
  let playersPackaged = [];

  for (let id in players) {
    playersPackaged.push({
      name: players[id].name,
      id: id,
      ready: players[id].ready,
    });
  }

  return playersPackaged;
}

function checkIfAllPlayersReady(roomCode) {
  let players = gameRooms[roomCode].players;

  for (let id in players) {
    if (!players[id].ready) {
      return false;
    }
  }

  return true;
}

const port = process.env.PORT || 3001;

server.listen(port, function() {
  console.log(`Horrible people listen to ${port}`);
});