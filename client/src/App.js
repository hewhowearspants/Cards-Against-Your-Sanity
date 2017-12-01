import React, { Component } from 'react';
import './App.css';
import io from "socket.io-client";

import Home from './components/Home';
import Lobby from './components/Lobby';
import Game from './components/Game';

var socket;

class App extends Component {
  constructor() {
    super();

    this.state = {
      name: '',
      cards: [],
      roomCode: '',
      currentScreen: 'home',
      players: [],
      cardCzar: false,
      cardCzarName: '',
      blackCard: null,
      gameStarted: false,
      playedCount: 0,
      cardSelection: {},
    }

    this.handleInputChange = this.handleInputChange.bind(this);
    this.handleCardSelection = this.handleCardSelection.bind(this);
    this.handleCardSelectionSubmit = this.handleCardSelectionSubmit.bind(this);
    this.createGame = this.createGame.bind(this);
    this.joinGame = this.joinGame.bind(this);
    this.readyUp = this.readyUp.bind(this);
    this.startGame = this.startGame.bind(this);
  }

  componentDidMount() {
    socket = io.connect();

    socket.on('joined', (data) => {
      this.setState({
        cards: data.cards,
        roomCode: data.roomCode,
      })
      console.log(data.cards);
    })

    socket.on('update players', (data) => {
      this.setState({
        players: data.players
      })
    })

    socket.on('bad roomcode', () => {
      console.log('bad roomcode');
    });

    socket.on('room full', () => {
      console.log("fuck off, room full");
    });

    socket.on('start game', (data) => {
      this.setState({
        currentScreen: 'game',
        cardCzarName: data.cardCzarName
      });
    })

    socket.on('card czar', (data) => {
      console.log('you are the card czar!');
      this.setState({
        cardCzar: true,
        blackCard: data.blackCard,
      });
    })

    socket.on('pick your cards', (data) => {
      console.log(`pick ${data.blackCard.pick} of your cards!`);
      this.setState({
        blackCard: data.blackCard,
        gameStarted: true,
      })
    })
  }

  createGame() {
    if (this.state.name.length > 0) {
      console.log(this.state.name + ' creating game');
      socket.emit('create', {name: this.state.name});
      this.setState({
        currentScreen: 'lobby'
      })
    }
  }

  joinGame() {
    console.log(`${this.state.name} joining game ${this.state.roomCode}`);
    socket.emit('join', {name: this.state.name, roomCode: this.state.roomCode});
    this.setState({
      currentScreen: 'lobby',
      joiningGame: false,
    });
  }

  startGame() {
    console.log("let's start this shit");
    socket.emit('czar ready', {blackCard: this.state.blackCard, roomCode: this.state.roomCode});
    this.setState({
      gameStarted: true,
    });
  }

  handleInputChange(event) {
    let name = event.target.name;
    let value = event.target.value;
    this.setState({
      [name]: value
    });
  }

  setScreen(screen) {
    this.setState({
      currentScreen: screen
    })
  }

  readyUp() {
    socket.emit('player ready', {roomCode: this.state.roomCode});
  }

  handleCardSelection(text) {

    let cardSelection = Object.assign({}, this.state.cardSelection);

    if (!cardSelection[text]) {
      if (Object.keys(cardSelection).length < this.state.blackCard.pick) {
        let i = 1;

        while (Object.values(cardSelection).indexOf(i) > -1) {
          i++;
        }

        cardSelection[text] = i;

      } else {
        console.log('selected too many cards');
      }
    } else {
      console.log('deleting ' + text);
      delete cardSelection[text];
    }

    this.setState({
      cardSelection: cardSelection
    })
  }

  handleCardSelectionSubmit() {
    let sortableSelection = [];
    let cardSelection = Object.assign({}, this.state.cardSelection);
    let cards = Object.assign([], this.state.cards);

    for (let text in cardSelection) {
      sortableSelection.push([text, cardSelection[text]]);
      cards.splice(cards.indexOf(text), 1);
    }

    let sortedSelection = sortableSelection
      .sort((a, b) => {
        return a[1] - b[1];
      })
      .map((card) => {
        return card[0]
      });

    console.log(sortedSelection);

    socket.emit('card submit', {
      roomCode: this.state.roomCode,
      cardSelection: sortedSelection,
    })

    this.setState({
      cardSelection: {},
      cards
    })
  }

  render() {
    return (
      <div className="App">
        {this.state.currentScreen === 'home' ? 
          <Home 
            name={this.state.name}
            roomCode={this.state.roomCode}
            handleInputChange={this.handleInputChange}
            createGame={this.createGame}
            joinGame={this.joinGame}
          /> : ''}
        {this.state.currentScreen === 'lobby' ? 
          <Lobby 
            name={this.state.name}
            roomCode={this.state.roomCode}
            players={this.state.players}
            readyUp={this.readyUp}
          /> : ''}
        {this.state.currentScreen === 'game' ? 
          <Game 
            cardCzar={this.state.cardCzar}
            cardCzarName={this.state.cardCzarName}
            blackCard={this.state.blackCard}
            cards={this.state.cards}
            players={this.state.players}
            playedCount={this.state.playedCount}
            startGame={this.startGame}
            gameStarted={this.state.gameStarted}
          /> : ''}
      </div>
    );
  }
}

export default App;
