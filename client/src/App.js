import React, { Component } from 'react';
import logo from './logo.svg';
import './App.css';
import io from "socket.io-client";

import cards from './cards';

var socket;

const randBlackIndex = Math.floor(Math.random() * cards.blackCards.length);

class App extends Component {
  componentDidMount() {
    const socket = io.connect();
  }

  generateWhiteIndex() {
    return Math.floor(Math.random() * cards.whiteCards.length);
  }

  renderAnswers() {
    let whiteCards = [];

    for(let i = 0; i < cards.blackCards[randBlackIndex].pick; i++) {
      whiteCards.push(cards.whiteCards[this.generateWhiteIndex()]);
    }

    return whiteCards.map((card) => {
      return (
        <h1>{card}</h1>
      )
    })
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
