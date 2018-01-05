import React from 'react';

const Popup = (props) => {
  const message = props.popupMessage.split('. ').join('.<br />');

  return (
    <div className='popup'>
      <p dangerouslySetInnerHTML={{__html: message}}></p>
    </div>
  )
}

export default Popup;