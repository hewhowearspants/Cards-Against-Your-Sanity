import React, { Component } from 'react';
import Scores from './Scores';
import Winners from './Winners';
import About from './About';

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
            {roomCode && <li className='room-code-menu'>Room: {roomCode}</li>}
            {currentScreen !== 'home' && <li className='leave-game-menu' onClick={leaveGame}>Leave Game.</li>}
            {players.length > 0 && <li className='scores-menu' onClick={() => this.setMenuScreen('scores')}>Scores.</li>}
            {winningCards.length > 0 && <li className='winners-menu' onClick={() => this.setMenuScreen('winners')}>Winners.</li>}
            <li className='about-menu' onClick={() => this.setMenuScreen('about')}>About.</li>
          </ul>
        }
        { menuScreen === 'scores' && <Scores setMenuScreen={this.setMenuScreen} players={players} /> }
        { menuScreen === 'winners' && <Winners setMenuScreen={this.setMenuScreen} winningCards={winningCards}/> }
        { menuScreen === 'about' && <About setMenuScreen={this.setMenuScreen} />}
      </div>
    )
  }
}

export default Menu;