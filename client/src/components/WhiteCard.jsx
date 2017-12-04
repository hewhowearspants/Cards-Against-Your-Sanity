import React, { Component } from 'react';
 
class WhiteCard extends Component{
  renderHTML(){
    return {__html: this.props.text}
  }

  renderWhiteCard(){
    console.log(this.renderHTML())
    return <p dangerouslySetInnerHTML={this.renderHTML()}></p>
  }

  render(){
    return (
      <div className='white-card' onClick={() => this.props.handleCardSelection(this.props.text)}>
        {this.renderWhiteCard()}
      </div>
    )
  }
}

export default WhiteCard;