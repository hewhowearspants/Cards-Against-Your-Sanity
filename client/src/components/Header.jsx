import React from 'react';

const Header = (props) => {
  return (
    <header>
      <h3>Cards Against</h3>
      <p>{props.name}</p>
      <p className={`menu-button ${props.showMenu ? 'selected' : ''}`} onClick={props.toggleMenu}>
        <i className='fas fa-bars'></i>
      </p>
    </header>
  )
}

export default Header;