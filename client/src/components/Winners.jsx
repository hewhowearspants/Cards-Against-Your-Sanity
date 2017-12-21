import React, { Component } from 'react';

import Winner from './Winner';

class Winners extends Component {
  constructor() {
    super()
    this.state = {
      currentWinner: null,
      currentWinnerIndex: 0,
    }
    this.iterateWinner = this.iterateWinner.bind(this);
  }

  componentWillMount() {
    this.setState({
      currentWinner: this.props.winningCards[0],
    })
  }

  iterateWinner(iteration) {
    this.setState((prevState) => {
      let currentWinnerIndex;
      if (prevState.currentWinnerIndex + iteration < 0) {
        currentWinnerIndex = this.props.winningCards.length - 1;
      } else if (prevState.currentWinnerIndex + iteration === this.props.winningCards.length) {
        currentWinnerIndex = 0;
      } else {
        currentWinnerIndex = prevState.currentWinnerIndex + iteration;
      }

      return {
        currentWinner: this.props.winningCards[currentWinnerIndex],
        currentWinnerIndex
      }
    })
  }

  render() {
    const { winningCards } = this.props;

    return (
      <div className='winners'>
        <span className='exit-screen' onClick={() => this.props.setMenuScreen('')}>
          <i className="far fa-times-circle"></i>
        </span>
        <div className='winner-container'>
          <div className={`prev-winner ${winningCards.length < 2 ? 'invisible' : ''}`} onClick={() => this.iterateWinner(-1)}>
            <i className="fas fa-chevron-left"></i>
          </div>
          <Winner winner={this.state.currentWinner}/>
          <div className={`next-winner ${winningCards.length < 2 ? 'invisible' : ''}`} onClick={() => this.iterateWinner(1)}>
            <i className="fas fa-chevron-right"></i>
          </div>
        </div>
      </div>
    )
  }
}

export default Winners;