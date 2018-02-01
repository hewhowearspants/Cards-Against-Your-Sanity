import React from 'react';

const Scores = (props) => {
  function renderPlayers() {
    let sortedPlayers = props.players;

    sortedPlayers.sort((a, b) => {
      return b.score - a.score
    })

    return sortedPlayers.map((player, index) => {
      return (
        <p key={index} className='player'><span className='name'>{player.name}</span> {player.score}</p>
      )
    })
  }

  return (
    <div className='scores'>
      <span className='exit-screen' onClick={() => props.setMenuScreen('')}>
        <i className="far fa-times-circle"></i>
      </span>
      {renderPlayers()}
    </div>
  )
}

export default Scores;