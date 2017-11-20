const express = require('express');
const logger = require('morgan');
const path = require('path');

const app = express();

const server = require('http').createServer(app);
const io = require('socket.io')(server);

app.use(logger('dev'));
app.use(express.static(__dirname + '/public'));

io.on('connection', (socket) => {
  console.log(socket.id);

  socket.emit('room code', {roomCode: roomCodeGen()})
})

function roomCodeGen() {
  let roomCode = '';
  let charBank = 'abcdefghijklmnopqrstuvwxyz0123456789';

  for(let i = 0; i < 5; i++){
    roomCode += charBank.charAt(Math.floor(Math.random() * charBank.length));
  }

  return roomCode;
}

const port = process.env.PORT || 3001;

server.listen(port, function() {
  console.log(`Horrible people listen to ${port}`);
});