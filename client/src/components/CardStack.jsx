import React from 'react';

import Card from './Card';

const CardStack = (props) => {
  return (
    <div className={`${props.selection}-selection`} onClick={props.changeSelection}>
      {props.cards.map((text, index) => {
        return (
          <Card color='white' key={index} text={text} />
        )
      })}
    </div>
  )
}

export default CardStack;