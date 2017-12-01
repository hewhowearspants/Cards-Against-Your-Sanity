import React, { Component } from 'react';

class CardCzar extends Component {
  renderHTML(){
    return {__html: this.props.blackCard.text}
  }

  renderBlackCard(){
    console.log(this.renderHTML())
    return <p dangerouslySetInnerHTML={this.renderHTML()}></p>
  }

  render(){
    return (
      <div className='card-czar'>
        <div className='black-card'>
          {this.props.blackCard ? this.renderBlackCard() : ''}
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