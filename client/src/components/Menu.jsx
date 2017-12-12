import React from 'react';

const Menu = (props) => {
  return (
    <div className='menu'>
      <p onClick={props.leaveGame}>Leave Game</p>
      {props.roomCode && <p>Room: {props.roomCode}</p>}
      <p>Scores</p>
      <p>Winners</p>
    </div>
  )
}

export default Menu;