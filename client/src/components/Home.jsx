import React, { Component } from 'react';

import NameField from './NameField';
import CodeField from './CodeField';

class Home extends Component {
  constructor() {
    super();

    this.state = {
      joiningGame: false,
    }
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
    return (
      <div className='home'>
        {this.state.joiningGame ? 
          <CodeField roomCode={this.props.roomCode} handleInputChange={this.props.handleInputChange} /> 
          : <NameField name={this.props.name} handleInputChange={this.props.handleInputChange} />}
        {!this.state.joiningGame ? <button onClick={this.props.createGame}>Create</button> : ''}
        <button onClick={this.state.joiningGame ? this.props.joinGame : () => this.toggleJoiningGame()}>Join</button>
      </div>
    )
  }
}

export default Home;