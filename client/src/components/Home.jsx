import React from 'react';

import InputField from './InputField';

const Home = (props) => {
  return (
    <div className='home'>
      <div className='top'>
        <InputField
          value={!props.joiningGame ? props.name : props.roomCode}
          max={!props.joiningGame ? 20 : 5}
          fieldName={!props.joiningGame ? "name" : "roomCode"}
          placeholder={!props.joiningGame ? "Who are you?" : "Enter code"}
          handleInputChange={props.handleInputChange} />
        {!props.joiningGame ? <button onClick={props.createGame}>Create</button> : <button onClick={props.toggleJoiningGame}>Back</button>}
        <button onClick={props.joiningGame ? props.joinGame : () => props.toggleJoiningGame()}>Join</button>
      </div>
      <div className='bottom'>
        <img className='logo' src='../favicon.png' alt='shitty logo' />
      </div>
    </div>
  )
}

export default Home;