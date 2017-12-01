import React, { Component } from 'react';

import CardCzar from './CardCzar';
import Player from './Player';



class Game extends Component {

  render() {
    return (
      <div className='game'>
        {this.props.cardCzar ? 
          <CardCzar 
            blackCard={this.props.blackCard}
            message='Read the card aloud and press "START" when finished'
            startGame={this.props.startGame}
            gameStarted={this.props.gameStarted}
          />
        : <Player 
            blackCard={this.props.blackCard}
            message={`Waiting for ${this.props.cardCzarName} to read the black card`}
            cards={this.props.cards}
            gameStarted={this.props.gameStarted}
          />
        }
        {this.props.gameStarted ?
          <div className='played-count'>
            <p>{this.props.playedCount} / {this.props.players.length - 1} ready</p>
          </div>
        : ''}
      </div>
    )
  }
}

export default Game;