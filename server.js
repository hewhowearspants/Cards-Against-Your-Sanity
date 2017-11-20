const express = require('express');
const logger = require('morgan');
const path = require('path');

const app = express();

const server = require('http').createServer(app);
const io = require('socket.io')(server);

app.use(logger('dev'));
app.use(express.static(__dirname + '/public'));

const port = process.env.PORT || 3000;

server.listen(port, function() {
  console.log(`Horrible people listen to ${port}`);
});