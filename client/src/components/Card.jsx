import React, { Component } from 'react';
 
class Card extends Component {
  constructor() {
    super();

    this.state = {
      offset: 0
    }

    this.handleHover = this.handleHover.bind(this);
  }

  renderHTML() {
    return {__html: this.props.text}
  }

  renderCard() {
    return <p style={{zIndex: this.props.index}} dangerouslySetInnerHTML={this.renderHTML()}></p>
  }

  handleHover(event) {
    let eventName = event.dispatchConfig.registrationName;

    if (eventName === 'onMouseEnter') {
      let text = document.querySelector(`#white-card-${this.props.index} p`);
      let offset = text.offsetHeight;
      if (this.props.showPick) {
        offset += 10;
      }
      this.setState({
        offset,
      })
    } else if (eventName === 'onMouseLeave') {
      this.setState({
        offset: 0
      })
    } 
  }

  render() {
    const { color, showPick, gameStarted, index, text, hoverable } = this.props;

    return (
      <div className={`${color}-card`} 
           id={hoverable ? `${color}-card-${index}` : ''} 
           style={{zIndex: index, transform:`translateZ(${index}px)`, marginBottom: hoverable ? this.state.offset ? `-${155 - this.state.offset}px` : `-155px` : null}}
           onMouseEnter={hoverable ? this.handleHover : null} 
           onMouseLeave={hoverable ? this.handleHover : null}>
        {this.renderCard()}
        {gameStarted && showPick && <button onClick={() => this.props.handleCardSelection(text)}>pick</button>}
      </div>
    )
  }
}
export default Card;