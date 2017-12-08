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
      winningCards: [],
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
      let playerSelections = [];

      for (let id in playedCards) {
        playerSelections.push(playedCards[id]);
      }

      if (cardCzarSocket) {
        console.log('sending card czar: ' + playerSelections)
        cardCzarSocket.emit('czar chooses', {playerSelections: playerSelections});
      }
    }
  })

  socket.on('czar has chosen', (data) => {
    let players = gameRooms[data.roomCode].players;
    let playedCards = gameRooms[data.roomCode].playedCards;
    let winner = {};

    console.log(`card czar chose ${data.czarChoice}`);

    for (let id in playedCards) {
      if (playedCards[id][0] === data.czarChoice[0]) {
        winner.id = id;
        winner.name = players[id].name;
      }
    }

    socket.broadcast.in(data.roomCode).emit('a winner is', {winner});
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
  let player = {
    name,
    cards: refillWhiteCards(roomCode),
    ready: false,
    winningCards: [],
  }

  let players = gameRooms[roomCode].players;
  let czarOrder = gameRooms[roomCode].czarOrder;

  players[id] = player;
  czarOrder.push({id: id, name: player.name});

  let playersList = preparePlayerListToSend(roomCode);

  io.sockets.in(roomCode).emit('update players', {players: playersList});

}

function removePlayerFromRoom(roomCode, id) {
  let players = gameRooms[roomCode].players;
  let playedCards = gameRooms[roomCode].playedCards;
  let czarOrder = gameRooms[roomCode].czarOrder;

  if (players[id]) {
    console.log(players[id].name + ' left room ' + roomCode);

    delete players[id];

    let playersList = preparePlayerListToSend(roomCode);
    io.sockets.in(roomCode).emit('update players', {players: playersList});
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

function shuffleCards(cards) {
  let shuffledCards = [];

  for(let i = 0; i < cards.length; i++) {
    randIndex = Math.floor(Math.random() * cards.length);
    shuffledCards.push(cards.splice(randIndex, 1)[0]);
  };

  return shuffledCards;
}

function refillWhiteCards(roomCode, playerCards = []) {
  let whiteCards = gameRooms[roomCode].whiteCards;

  for(let i = playerCards.length; i < 10; i++) {
    let whiteCard = whiteCards.pop()
    playerCards.push(whiteCard);
  }

  return playerCards;
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

function findById(arrayOfObjects, id) {
  for (let i = 0; i < arrayOfObjects.length; i++) {
    if (arrayOfObjects[i].id === id) {
      return i;
    }
  }
}