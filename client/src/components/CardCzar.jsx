import React, { Component } from 'react';

import CardStack from './CardStack';
import Card from './Card';

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

  render(){
    const { prevSelection, currentSelection, nextSelection } = this.state;

    return (
      <div className='card-czar'>
        {this.props.blackCard && <Card color='black' text={this.props.blackCard.text} />}
        <div className='message'>
          <p>{this.props.message}</p>
        </div>
        {this.props.playerSelections &&
          <div className='player-selections'>
            <CardStack 
              cards={this.props.playerSelections[prevSelection]}
              selection='prev'
              changeSelection={() => {this.changeSelection(-1)}}
              />
            <CardStack 
              cards={this.props.playerSelections[currentSelection]}
              selection='current'
              changeSelection={null}
              />
            <CardStack 
              cards={this.props.playerSelections[nextSelection]} 
              selection='next'
              changeSelection={() => {this.changeSelection(1)}}
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