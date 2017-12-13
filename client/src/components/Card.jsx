import React, { Component } from 'react';
 
class Card extends Component {
  constructor() {
    super()

    this.state = ({
      hovered: false
    })

    this.handleHover = this.handleHover.bind(this);
  }

  handleHover(bool) {
    this.setState({
      hovered: bool,
    })
  }

  renderHTML() {
    return {__html: this.props.text}
  }

  renderCard() {
    return <p style={{zIndex: this.props.index}} dangerouslySetInnerHTML={this.renderHTML()}></p>
  }

  render() {
    const { hovered } = this.state;
    const { color, heldBy, gameStarted } = this.props;
    return (
      <div 
        className={`${this.props.color}-card`} 
        style={{zIndex: this.props.index, transform:`translateZ(${this.props.index}px)`}}
        onMouseEnter={() => this.handleHover(true)}
        onMouseLeave={() => this.handleHover(false)}
        >
        {this.renderCard()}
        {hovered && color === 'white' && heldBy === 'player' && gameStarted && <button onClick={() => this.props.handleCardSelection(this.props.text)}>PICK</button>}
      </div>
    )
  }
}
export default Card;