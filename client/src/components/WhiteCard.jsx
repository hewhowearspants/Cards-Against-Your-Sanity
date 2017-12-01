import React from 'react';
 
const WhiteCard = (props) => {
  return (
    <div className={'white-card' + (props.selection ? ' selected' : '')} onClick={() => props.handleCardSelection(props.text)}>
      <p>{props.text} <span>{props.selection ? props.selection : ''}</span></p>
    </div>
  )
}

export default WhiteCard;