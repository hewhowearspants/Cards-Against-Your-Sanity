const express = require('express');
const logger = require('morgan');
const path = require('path');
const cards = require('./cards.js');

const app = express();

const server = require('http').createServer(app);

app.use(logger('dev'));
app.use(express.static(__dirname + '/public'));

const port = process.env.PORT || 3001;

server.listen(port, function() {
  console.log(`Horrible people listen to ${port}`);
});

const io = require('socket.io')(server);
//const io = require('socket.io', { rememberTransport: false, transports: ['WebSocket', 'Flash Socket', 'AJAX long-polling'] })(server);

const gameRooms = {};

io.on('connection', (socket) => {
  console.log(socket.id + ' connected');

  socket.emit('connected');

  socket.on('create', (data) => {
    let roomCode = roomCodeGen();

    console.log(data.name + ' has created a game, code ' + roomCode);

    gameRooms[roomCode] = {
      players: {},
      czarOrder: [],
      playedCards: {},
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
      let cardCzar = czarOrder[0];
      let cardCzarSocket = io.sockets.connected[cardCzar.id];

      let blackCard = blackCards.pop();
      
      console.log('all players ready, starting game');
      console.log(cardCzar.name + ' is the card czar');

      io.sockets.in(roomCode).emit('start game', {cardCzarName: cardCzar.name});

      if (cardCzarSocket) {
        cardCzarSocket.emit('card czar', {blackCard: blackCard});
      }
    }
  });

  socket.on('czar ready', (data) => {
    socket.broadcast.to(data.roomCode).emit('pick your cards', {blackCard: data.blackCard});
  });

  socket.on('card submit', (data) => {
    let roomCode = data.roomCode;
    let players = gameRooms[roomCode].players;
    let playedCards = gameRooms[roomCode].playedCards;
    let czarOrder = gameRooms[roomCode].czarOrder;

    console.log(`${players[socket.id].name} submitted: ${data.cardSelection}`);

    playedCards[socket.id] = data.cardSelection;

    io.sockets.in(roomCode).emit('player submitted', {playedCount: Object.keys(playedCards).length});

    if (Object.keys(playedCards).length === Object.keys(players).length - 1) {
      let cardCzarSocket = io.sockets.connected[czarOrder[0].id];

      if (cardCzarSocket) {
        cardCzarSocket.emit('czar chooses', {playedCards: playedCards});
      }
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
  let charBank = 'abcdefghijklmnpqrstuvwxyz123456789';

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
    let whiteCard = whiteCards.pop()
    cards.push(whiteCard);
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