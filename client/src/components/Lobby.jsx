import React, { Component } from 'react';

class Lobby extends Component {
  renderPlayers() {
    return this.props.players.map((player) => {
      return <p className='player' key={new Date()}>{player}</p>
    })
  }

  render() {
    return (
      <div className='lobby'>
        <h2>Welcome to</h2>
        <h1>{this.props.roomCode}</h1>
        <h3>Horrible People:</h3>
        {this.renderPlayers()}
      </div>
    )
  }
}

export default Lobby;