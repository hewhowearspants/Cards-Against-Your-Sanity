import React from 'react';

const CodeField = (props) => {
  return (
    <input
      type="text"
      name="roomCode"
      value={props.roomCode}
      placeholder="Room code"
      onChange={props.handleInputChange}
    />
  )
}

export default CodeField;