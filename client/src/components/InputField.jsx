import React from 'react';

const InputField = (props) => {
  return (
    <input
      type="text"
      maxLength={props.max}
      name={props.fieldName}
      value={props.value}
      placeholder={props.placeholder}
      onChange={props.handleInputChange}
    />
  )
}

export default InputField;