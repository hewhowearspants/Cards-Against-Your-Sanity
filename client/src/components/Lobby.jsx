import React from 'react';

const Lobby = (props) => {

  return (
    <div className='lobby'>
      <h2>Welcome to</h2>
      <h1>{props.roomCode}</h1>
      <div className='player-list-container'>
        <h3>Horrible People:</h3>
        <div className='player-list'>
          {props.players && props.players.map((player) => {
            return (
              <p className={'player' + (player.ready ? ' ready' : '')} key={player.id}>{player.name}</p>
            )
          })}
        </div>
      </div>
      {props.message && <p>{props.message}</p>}
      <button onClick={props.readyUp}>Ready</button>
    </div>
  )
}

export default Lobby;