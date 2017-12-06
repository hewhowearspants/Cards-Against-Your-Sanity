import React from 'react';

const Menu = (props) => {
  return (
    <div className='menu'>
      <p onClick={props.leaveGame}>Leave Game</p>
    </div>
  )
}

export default Menu;