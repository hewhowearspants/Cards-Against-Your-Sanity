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
          />
      )
    });
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