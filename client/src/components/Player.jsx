import React, { Component } from 'react';

import Card from './Card';

class Player extends Component {
  
  renderWhiteCards() {
    let showPick = false;
    if (Object.keys(this.props.cardSelection) && this.props.blackCard) {
      showPick = Object.keys(this.props.cardSelection).length !== this.props.blackCard.pick;
    }
    return this.props.cards.map((text, index, array) => {
      return (
        <Card 
          key={index}
          index={index}
          heldBy='player'
          color='white'
          handleCardSelection={this.props.handleCardSelection}
          text={text}
          showPick={showPick}
          gameStarted={this.props.gameStarted}
          hoverable={index < array.length - 1 ? true : false}
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
        <div key={card[1]} className={`selected-card ${!this.props.gameStarted ? 'pending' : ''}`}>
          <p>
            <span className='selected-card-number'>{card[1]} </span>
      <span className='selected-card-text' dangerouslySetInnerHTML={{__html: card[0] || `<span class='message'>${this.props.message}</span>`}}></span>
            <span className='remove-selected-card'>{card[0] && this.props.gameStarted ? <span onClick={() => this.props.handleCardSelection(card[0])}><i className="fas fa-times-circle"></i></span> : ''}</span>
          </p>
        </div>
      )
    })
  }

  render() {
    return (
      <div className='player'>
        {this.props.blackCard &&
          <div className='selection'>
            {this.props.blackCard && <Card color='black' text={this.props.blackCard.text} />}
            {this.props.blackCard && this.renderSelection()}
          </div>
        }
        <div className='white-cards'>
          {this.renderWhiteCards()}
        </div>
        {this.props.gameStarted && (Object.keys(this.props.cardSelection).length === this.props.blackCard.pick) && 
          <button onClick={this.props.handleCardSelectionSubmit}>OK</button>
        }
      </div>
    )
  }
}

export default Player;