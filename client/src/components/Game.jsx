import React from 'react';

import CardCzar from './CardCzar';
import Player from './Player';

const Game = (props) => {

  return (
    <div className='game'>
      {props.cardCzar ? 
        <CardCzar 
          blackCard={props.blackCard}
          message={props.message}
          startGame={props.startGame}
          gameStarted={props.gameStarted}
          playerSelections={props.playerSelections}
          submitCzarSelection={props.submitCzarSelection}
        />
      : <Player 
          blackCard={props.blackCard}
          message={props.message}
          cards={props.cards}
          gameStarted={props.gameStarted}
          cardSelection={props.cardSelection}
          handleCardSelection={props.handleCardSelection}
          handleCardSelectionSubmit={props.handleCardSelectionSubmit}
        />
      }
    </div>
  )
}

export default Game;