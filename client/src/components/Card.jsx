import React, { Component } from 'react';
 
class Card extends Component {
  renderHTML() {
    return {__html: this.props.text}
  }

  renderCard() {
    return <p dangerouslySetInnerHTML={this.renderHTML()}></p>
  }

  render() {
    return (
      <div className={`${this.props.color}-card`} onClick={this.props.gameStarted ? () => {this.props.handleCardSelection(this.props.text)} : null}>
        {this.renderCard()}
      </div>
    )
  }
}

export default Card;