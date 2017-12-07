import React, { Component } from 'react';

import Card from './Card';

class CardStack extends Component {
  renderWhiteCards() {
    return this.props.cards.map((text, index) => {
      return (
        <Card color='white' key={index} text={text} />
      )
    })
  }

  render() {
    return (
      <div className={`${this.props.selection}-selection`} onClick={this.props.changeSelection}>
        {/* {this.renderWhiteCards()} */}
        {this.props.cards.map((text, index) => {
          return (
            <Card color='white' key={index} text={text} />
          )
        })}
      </div>
    )
  }
}

export default CardStack;