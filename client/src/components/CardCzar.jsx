import React from 'react';

const CardCzar = (props) => {

    return (
      <div className='card-czar'>
        <div className='black-card'>
          <p>{props.blackCard ? props.blackCard.text : ''}</p>
        </div>
        <div className='message'>
          <p>{props.message}</p>
        </div>
        {!props.gameStarted ? 
          <button onClick={props.startGame}>START</button>
        : ''}
      </div>
    )

}

export default CardCzar;