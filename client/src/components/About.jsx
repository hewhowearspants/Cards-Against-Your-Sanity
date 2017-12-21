import React from 'react';

const About = (props) => {

  return (
    <div className='about'>
      <span className='exit-screen' onClick={() => props.setMenuScreen('')}>
        <i className="far fa-times-circle"></i>
      </span>
      <h1>WTF?</h1>
      <p>Cards Against <strike>Humanity</strike> Your Sanity is a party game for horrible people. Unlike most of the party games you've played before, Cards Against <strike>Humanity</strike> Your Sanity is as despicable and awkward as you and your friends.</p>
      <br/>
      <p>The game is simple. Each round, one player asks a question from a black card, and everyone else answers with their funniest white card.</p>
      <footer>Made with <span role='img' aria-label='poop'>&#128169;</span> by Ryan & Phil</footer>
    </div>
  )
}

export default About;