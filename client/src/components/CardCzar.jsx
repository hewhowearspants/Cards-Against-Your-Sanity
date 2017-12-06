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
      //this.changeSelection(0);
      let prevSelection;
      let currentSelection = 0;
      let nextSelection;

      currentSelection - 1 < 0 ? prevSelection = nextProps.playerSelections.length - 1 : prevSelection = currentSelection - 1;
      currentSelection + 1 === nextProps.playerSelections.length ? nextSelection = 0 : nextSelection = currentSelection + 1;

      this.setState({
        prevSelection,
        currentSelection,
        nextSelection,
      });
    }
  }

  changeSelection(index) {
    let prevSelection;
    let currentSelection = index;
    let nextSelection;

    index - 1 < 0 ? prevSelection = this.props.playerSelections.length - 1 : prevSelection = index - 1;
    index + 1 === this.props.playerSelections.length ? nextSelection = 0 : nextSelection = index + 1;

    this.setState({
      prevSelection,
      currentSelection,
      nextSelection,
    });
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