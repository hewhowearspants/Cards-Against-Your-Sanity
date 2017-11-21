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
    }

    this.handleInputChange = this.handleInputChange.bind(this);
    this.createGame = this.createGame.bind(this);
    this.joinGame = this.joinGame.bind(this);
  }

  componentDidMount() {
    socket = io.connect();

    socket.on('room code', (data) => {
      console.log(data.roomCode)
    })

    socket.on('joined', (data) => {
      this.setState({
        cards: data.cards,
        roomCode: data.roomCode,
      })
      console.log(data.cards);
    })

    socket.on('new player', (data) => {
      this.setState({
        players: data.players
      })
    })

    socket.on('bad roomcode', () => {
      console.log('bad roomcode');
    });

    socket.on('players full', () => {
      console.log("fuck off, players full");
    });
  }

  renderCards() {
    return this.state.cards.map((card) => {
      return (
        <h2 key={card}>{card}</h2>
      )
    })
  }

  createGame() {
    console.log(this.state.name + ' creating game');
    socket.emit('create', {name: this.state.name});
    this.setState({
      currentScreen: 'lobby'
    })
  }

  joinGame() {
    console.log(`${this.state.name} joining game ${this.state.roomCode}`);
    socket.emit('join', {name: this.state.name, roomCode: this.state.roomCode});
    this.setState({
      currentScreen: 'lobby',
      joiningGame: false,
    });
  }

  handleInputChange(event) {
    let name = event.target.name;
    let value = event.target.value;
    this.setState({
      [name]: value
    });
  }

  render() {
    return (
      <div className="App">
        <header className="App-header">
          <h1 className="Question">{cards.blackCards[randBlackIndex].text}</h1>
        </header>
        <div className="Answers">
          {this.state.cards.length > 0 ? this.renderCards() : ''}
        </div>
        <input
            type="text"
            name="name"
            value={this.state.name}
            placeholder="Enter name"
            onChange={this.handleInputChange}
          />
        <button onClick={this.createGame}>Create</button>
        <button onClick={this.joinGame}>Join</button>
      </div>
    );
  }
}

export default App;
