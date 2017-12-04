import React, { Component } from 'react';

import WhiteCard from './WhiteCard';
import BlackCard from './BlackCard';

class Player extends Component {
  
  renderCards() {
    return this.props.cards.map((text, index) => {
      return (
        <WhiteCard 
          key={index}
          handleCardSelection={this.props.handleCardSelection}
          selection={this.props.cardSelection[text]}
          text={text}
          gameStarted={this.props.gameStarted}
          />
      )
    });
  }

  renderSelection() {
    let sortedSelection = [];
    let cardSelection = this.props.cardSelection;

    for (let i = 0; i < this.props.blackCard.pick; i++) {
      sortedSelection.push(['', i + 1]);
      for (let text in cardSelection) {
        if (cardSelection[text] === sortedSelection[i][1]) {
          sortedSelection[i][0] = text;
        }
      }
    }

    return sortedSelection.map((card) => {
      return (
        <div key={card[1]} className='selected-card' onClick={() => this.props.handleCardSelection(card[0])}>
          <p><span>{card[1]} </span>{card[0]}</p>
        </div>
      )
    })
  }

  render() {
    return (
      <div className='player'>
        {this.props.blackCard ? 
          <BlackCard text={this.props.blackCard.text} /> 
          : ''
        }
        <div className='message'>
          <p>{this.props.message}</p>
        </div>
        <div className='selection'>
          {this.props.blackCard ? this.renderSelection() : ''}
        </div>
        <div className='white-cards'>
          {this.renderCards()}
        </div>
        {this.props.gameStarted && (Object.keys(this.props.cardSelection).length === this.props.blackCard.pick) ? 
          <button onClick={this.props.handleCardSelectionSubmit}>OK</button>
          : ''
        }
      </div>
    )
  }
}

export default Player;