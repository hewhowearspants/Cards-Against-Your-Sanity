import React, { Component } from 'react';

class CardCzar extends Component {

  render() {
    return (
      <div className='card-czar'>
        <div className='card-czar-black-card'>
          <p>{this.props.blackCard ? this.props.blackCard.text : ''}</p>
        </div>
        <div className='message'>
          <p>{this.props.message}</p>
        </div>
        {!this.props.gameStarted ? 
          <button onClick={this.props.startGame}>START</button>
        : ''}
      </div>
    )
  }
}

export default CardCzar;