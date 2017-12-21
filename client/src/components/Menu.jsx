import React, { Component } from 'react';
import Scores from './Scores';
import Winners from './Winners';

class Menu extends Component {
  constructor() {
    super();
    this.state = {
      menuScreen: ''
    }
    this.setMenuScreen = this.setMenuScreen.bind(this);
  }

  setMenuScreen(screen) {
    this.setState({
      menuScreen: screen,
    })
  }

  render() {
    const { leaveGame, roomCode, players, winningCards, currentScreen } = this.props;
    const { menuScreen } = this.state;

    return (
      <div className={`menu ${menuScreen !== '' && 'expanded'}`}>
        { menuScreen === '' &&
          <ul className='menu-list'>
            {currentScreen !== 'home' && <li onClick={leaveGame}>Leave Game</li>}
            {roomCode && <li>Room: {roomCode}</li>}
            {players.length > 0 && <li onClick={() => this.setMenuScreen('scores')}>Scores</li>}
            {winningCards.length > 0 && <li onClick={() => this.setMenuScreen('winners')}>Winners</li>}
          </ul>
        }
        { menuScreen === 'scores' && <Scores setMenuScreen={this.setMenuScreen} players={players} /> }
        { menuScreen === 'winners' && <Winners setMenuScreen={this.setMenuScreen} winningCards={winningCards}/> }
      </div>
    )
  }
}

export default Menu;