import React from 'react';
 
const WhiteCard = (props) => {
  return (
    <div className='white-card' onClick={() => props.handleCardSelection(props.text)}>
      <p>{props.text}</p>
    </div>
  )
}

export default WhiteCard;