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
      let players = gameRooms[roomCode].players;

      if (Object.keys(players).length < 10) {

        socket.join(roomCode);
        joinPlayerToRoom(socket.id, data.name, roomCode);
        socket.emit('joined', {
          cards: [...players[socket.id].cards],
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
    let players = gameRooms[roomCode].players;
    let blackCards = gameRooms[roomCode].blackCards;
    let czarOrder = gameRooms[roomCode].czarOrder;

    console.log(players[socket.id].name + ' is ready');
    players[socket.id].ready = true;

    let playersList = preparePlayerListToSend(roomCode);
    io.sockets.in(roomCode).emit('update players', {players: playersList});

    if (checkIfAllPlayersReady(roomCode)) {
      let blackCard;
      while (!blackCard || blackCard.pick < 2) { 
        blackCard = blackCards.pop();
      }
      let cardCzar = czarOrder[0];
      let cardCzarSocket = io.sockets.connected[cardCzar.id];

      if (cardCzarSocket) {
        cardCzarSocket.emit('card czar', {blackCard: blackCard});
      }

      console.log('all players ready, starting game');
      console.log(cardCzar.name + ' is the card czar');

      io.sockets.in(roomCode).emit('start game', {cardCzarName: cardCzar.name});
      socket.to(cardCzar.id).emit('card czar', {blackCard: blackCard});
    }
  })

  socket.on('disconnect', () => {

    for (let roomCode in gameRooms) {
      let players = gameRooms[roomCode].players

      if (players[socket.id]) {
        console.log(players[socket.id].name + ' disconnected');

        delete players[socket.id];

        let playersList = preparePlayerListToSend(roomCode);
        io.sockets.in(roomCode).emit('update players', {players: playersList});
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

  let players = gameRooms[roomCode].players;
  let czarOrder = gameRooms[roomCode].czarOrder;

  players[id] = player;
  czarOrder.push({id: id, name: player.name});

  console.log(gameRooms[roomCode].czarOrder);

  let playersList = preparePlayerListToSend(roomCode);

  io.sockets.in(roomCode).emit('update players', {players: playersList});

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
  let whiteCards = gameRooms[roomCode].whiteCards;

  for(let i = 0; i < 10; i++) {
    let card = whiteCards.pop();
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