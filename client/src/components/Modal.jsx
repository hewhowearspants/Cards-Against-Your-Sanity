import React from 'react';

const Modal = (props) => {
  return (
    <div className='modal-overlay'>
      <div className='modal-window'>
        <p>{props.message}</p>
        {props.callback && <button onClick={props.callback}>OK</button>}
      </div>
    </div>
  )
}

export default Modal;