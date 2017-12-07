import React, { Component } from 'react';

import InputField from './InputField';

class Home extends Component {
  constructor() {
    super();

    this.state = {
      joiningGame: false,
    }

    this.toggleJoiningGame = this.toggleJoiningGame.bind(this);
  }

  toggleJoiningGame() {
    if (this.props.name.length > 0){
      this.setState((prevState) => {
        return {
          joiningGame: !prevState.joiningGame
        }
      })
    }
  }

  render() {
    const { joiningGame } = this.state;
    return (
      <div className='home'>
        <InputField
          value={!joiningGame ? this.props.name : this.props.roomCode}
          max={!joiningGame ? 20 : 5}
          fieldName={!joiningGame ? "name" : "roomCode"}
          placeholder={!joiningGame ? "Enter name" : "Enter code"}
          handleInputChange={this.props.handleInputChange} />
        {!joiningGame ? <button onClick={this.props.createGame}>Create</button> : <button onClick={this.toggleJoiningGame}>Back</button>}
        <button onClick={this.state.joiningGame ? this.props.joinGame : () => this.toggleJoiningGame()}>Join</button>
      </div>
    )
  }
}

export default Home;