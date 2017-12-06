import React from 'react';

const Header = (props) => {
  return (
    <header>
      <h3>Cards Against</h3><p className='menu-button' onClick={props.toggleMenu}>M</p>
    </header>
  )
}

export default Header;