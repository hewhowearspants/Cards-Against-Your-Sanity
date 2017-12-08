import React from 'react';

const InputField = (props) => {
  return (
    <input
      type="text"
      maxlength={props.max}
      name={props.fieldName}
      value={props.value}
      placeholder={props.placeholder}
      onChange={props.handleInputChange}
    />
  )
}

export default InputField;