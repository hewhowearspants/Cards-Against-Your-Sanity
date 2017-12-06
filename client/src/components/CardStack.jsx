import React, { Component } from 'react';

import WhiteCard from './WhiteCard';

class CardStack extends Component {
  renderWhiteCards() {
    return this.props.cards.map((text, index) => {
      return (
        <WhiteCard key={index} text={text} />
      )
    })
  }

  render() {
    return (
      <div className={`${this.props.selection}-selection`} onClick={this.props.changeSelection}>
        {this.renderWhiteCards()}
      </div>
    )
  }
}

export default CardStack;