import React, { Component } from 'react';

import CardStack from './CardStack';

class CardCzar extends Component {
  constructor() {
    super() 

    this.state = {
      prevSelection: null,
      currentSelection: null,
      nextSelection: null,
    }
    
    this.changeSelection = this.changeSelection.bind(this);
  }

  componentWillReceiveProps(nextProps) {
    if (!this.props.playerSelections && nextProps.playerSelections) {
      this.setState({
        prevSelection: nextProps.playerSelections.length - 1,
        currentSelection: 0,
        nextSelection: 1 || 0,
      });
    }
  }

  changeSelection(iteration) {
    let length = this.props.playerSelections.length;

    this.setState((prevState) => {
      return {
        prevSelection: this._iterateSelection(prevState.prevSelection, iteration, length),
        currentSelection: this._iterateSelection(prevState.currentSelection, iteration, length),
        nextSelection: this._iterateSelection(prevState.nextSelection, iteration, length),
      }
    })
  }

  _iterateSelection(index, iteration, length) {
    index = index + iteration;

    if (index < 0) { 
      index = length - 1 
    } else if (index === length) { 
      index = 0
    } 

    return index;
  }

  renderHTML(){
    return {__html: this.props.blackCard.text}
  }

  renderBlackCard(){
    //console.log(this.renderHTML())
    return <p dangerouslySetInnerHTML={this.renderHTML()}></p>
  }

  render(){
    return (
      <div className='card-czar'>
        <div className='black-card'>
          {this.props.blackCard && this.renderBlackCard()}
        </div>
        <div className='message'>
          <p>{this.props.message}</p>
        </div>
        {this.props.playerSelections &&
          <div className='player-selections'>
            <CardStack 
              cards={this.props.playerSelections[this.state.prevSelection]}
              selection='prev'
              changeSelection={() => {this.changeSelection(this.state.currentSelection - 1)}}
              />
            <CardStack 
              cards={this.props.playerSelections[this.state.currentSelection]}
              selection='current'
              changeSelection=''
              />
            <CardStack 
              cards={this.props.playerSelections[this.state.nextSelection]} 
              selection='next'
              changeSelection={() => {this.changeSelection(this.state.currentSelection + 1)}}
              />
          </div>
        }
        {!this.props.gameStarted &&
          <button onClick={this.props.startGame}>START</button>
        }
        {this.props.playerSelections &&
          <button onClick={this.props.submitSelection}>OMG THIS ONE</button>
        }
      </div>
    )
  }
}

export default CardCzar;