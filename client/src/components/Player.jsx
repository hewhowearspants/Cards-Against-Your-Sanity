import React, { Component } from 'react';

class Player extends Component {
  
  renderCards() {
    return this.props.cards.map((card, index) => {
      return <p key={index}>{card}</p>
    });
  }

  render() {
    return (
      <div className='player'>
        <div className='player-black-card'>
          <p>{this.props.blackCard ? this.props.blackCard.text : ''}</p>
        </div>
        <div className='message'>
          <p>{this.props.message}</p>
        </div>
        <div className='white-cards'>
          {this.renderCards()}
        </div>
      </div>
    )
  }
}

export default Player;