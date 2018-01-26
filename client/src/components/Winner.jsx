import React from 'react';

import Card from './Card';

const Winner = ({ winner }) => {
  function renderWhiteCards() {
    return winner.white.map((text, index, array) => {
      return <Card key={index} index={index} color='white' text={text} hoverable={index < array.length - 1 ? true : false} />
    })
  }

  return (
    <div className='winner'>
      <Card color='black' text={winner.black.text} />
      {renderWhiteCards()}
      <div className='winner-name'>
        <p>by:</p>
        <p>{winner.name}</p>
      </div>
    </div>
  )
}

export default Winner;