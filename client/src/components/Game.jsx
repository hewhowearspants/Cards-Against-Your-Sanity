import React from 'react';

import CardCzar from './CardCzar';
import Player from './Player';

const Game = (props) => {

  return (
    <div className='game'>
      {props.cardCzar ? 
        <CardCzar 
          blackCard={props.blackCard}
          message={!props.gameStarted ?
                    'Read the card aloud and press "START" when finished' : ''}
          startGame={props.startGame}
          gameStarted={props.gameStarted}
        />
      : <Player 
          blackCard={props.blackCard}
          message={props.gameStarted ? 
                    `Pick ${props.blackCard.pick} of your cards` :
                    `Waiting for ${props.cardCzarName} to read the black card`
                  }
          cards={props.cards}
          gameStarted={props.gameStarted}
          cardSelection={props.cardSelection}
          handleCardSelection={props.handleCardSelection}
          handleCardSelectionSubmit={props.handleCardSelectionSubmit}
        />
      }
      {props.gameStarted ?
        <div className='played-count'>
          <p>{props.playedCount} / {props.players.length - 1} ready</p>
        </div>
      : ''}
    </div>
  )
}

export default Game;