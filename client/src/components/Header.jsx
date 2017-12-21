import React, { Component } from 'react';

class Header extends Component {
  state = {
    nameFontSize: '1',
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.name.length > 15) {
      this.setState({
        nameFontSize: '.8'
      })
    } else if (nextProps.name.length > 10) {
      this.setState({
        nameFontSize: '.9'
      })
    } else {
      this.setState({
        nameFontSize: '1'
      })
    }
  }

  render() {
    const { name, showMenu, toggleMenu } = this.props;

    return (
      <header>
        <h3>Cards Against</h3>
        <p className='player-header-name' style={{fontSize: `${this.state.nameFontSize}em`}}>{name}</p>
        <p className={`menu-button ${showMenu ? 'selected' : ''}`} onClick={toggleMenu}>
          <i className='fas fa-bars'></i>
        </p>
      </header>
    )
  }
}

export default Header;