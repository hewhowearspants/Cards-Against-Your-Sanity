import React, { Component } from 'react';
import logo from './logo.svg';
import './App.css';
import io from "socket.io-client";

import cards from './cards';

var socket;

const randBlackIndex = Math.floor(Math.random() * cards.blackCards.length);

class App extends Component {
  constructor() {
    super();

    this.state = {
      name: '',
      cards: [],
      roomCode: '',
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
  }

  generateWhiteIndex() {
    return Math.floor(Math.random() * cards.whiteCards.length);
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
  }

  joinGame() {
    console.log(`${this.state.name} joining game ${this.state.roomCode}`);
    socket.emit('join', {name: this.state.name, roomCode: this.state.roomCode});
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
          {this.renderAnswers()}
        </div>
      </div>
    );
  }
}

export default App;
