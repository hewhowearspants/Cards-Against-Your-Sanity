import React, { Component } from 'react';
 
class Card extends Component {

  renderHTML() {
    return {__html: this.props.text}
  }

  renderCard() {
    return <p style={{zIndex: this.props.index}} dangerouslySetInnerHTML={this.renderHTML()}></p>
  }

  render() {
    const { color, showPick, gameStarted, index, text } = this.props;
    return (
      <div className={`${color}-card`} style={{zIndex: index, transform:`translateZ(${index}px)`}}>
        {this.renderCard()}
        {gameStarted && showPick && <button onClick={() => this.props.handleCardSelection(text)}>PICK</button>}
      </div>
    )
  }
}
export default Card;