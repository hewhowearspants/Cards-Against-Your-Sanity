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
    this.setState((prevState) => {
      return {
        joiningGame: !prevState.joiningGame
      }
    })
  }

  render() {
    return (
      <div className='home'>
        <header className="App-header">
          <h1>Cards Against</h1>
        </header>
        {this.state.joiningGame ? 
          <CodeField roomCode={this.props.roomCode} handleInputChange={this.props.handleInputChange} /> 
          : <NameField name={this.props.name} handleInputChange={this.props.handleInputChange} />}
        {!this.state.joiningGame ? <button onClick={this.props.createGame}>Create</button> : ''}
        <button onClick={this.props.name.length > 0 ? this.state.joiningGame ? this.props.joinGame : () => this.toggleJoiningGame() : null}>Join</button>
      </div>
    )
  }
}

export default Home;