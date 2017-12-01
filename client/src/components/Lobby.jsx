import React, { Component } from 'react';

class Lobby extends Component {

  renderPlayers() {
    return this.props.players.map((player) => {
      return (
        <p className={'player' + (player.ready ? ' ready' : '')} key={player.id}>{player.name}</p>
      )
    })
  }

  render() {
    return (
      <div className='lobby'>
        <h2>Welcome to</h2>
        <h1>{this.props.roomCode}</h1>
        <h3>Horrible People:</h3>
        {this.renderPlayers()}
        <button onClick={this.props.readyUp}>Ready</button>
      </div>
    )
  }
}

export default Lobby;