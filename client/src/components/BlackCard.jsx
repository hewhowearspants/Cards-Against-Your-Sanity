import React, { Component } from 'react';

class BlackCard extends Component {
  renderHTML(){
    return {__html: this.props.text}
  }

  renderBlackCard(){
    console.log(this.renderHTML())
    return <p dangerouslySetInnerHTML={this.renderHTML()}></p>
  }

  render(){
    return (
      <div className='black-card'>
      {this.renderBlackCard()}
      </div>
    )
  }
}

export default BlackCard;