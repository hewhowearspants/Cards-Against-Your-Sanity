import React from 'react';

import Card from './Card';

const Winner = ({ winner }) => {
  function renderWhiteCards() {
    return winner.white.map((text, index) => {
      return <Card key={index} index={index} color='white' text={text} />
    })
  }

  return (
    <div className='winner'>
      <Card color='black' text={winner.black.text} />
      {renderWhiteCards()}
      <p className='winner-name'>by:<br/>{winner.name}</p> 
    </div>
  )
}

export default Winner;