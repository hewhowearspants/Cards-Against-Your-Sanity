import React from 'react';

const NameField = (props) => {
  return (
    <input
      type="text"
      name="name"
      value={props.name}
      placeholder="Enter name"
      onChange={props.handleInputChange}
    />
  )
}

export default NameField;