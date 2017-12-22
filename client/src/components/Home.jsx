import React from 'react';

import InputField from './InputField';

const Home = (props) => {
  return (
    <div className='home'>
      <InputField
        value={!this.props.joiningGame ? this.props.name : this.props.roomCode}
        max={!this.props.joiningGame ? 20 : 5}
        fieldName={!this.props.joiningGame ? "name" : "roomCode"}
        placeholder={!this.props.joiningGame ? "Who are you?" : "code"}
        handleInputChange={this.props.handleInputChange} />
      {!this.props.joiningGame ? <button onClick={this.props.createGame}>Create</button> : <button onClick={this.props.toggleJoiningGame}>Back</button>}
      <button onClick={this.props.joiningGame ? this.props.joinGame : () => this.props.toggleJoiningGame()}>Join</button>
      <div className='message'>
        {this.props.message}
      </div>
    </div>
  )
}

export default Home;