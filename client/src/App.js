import React, { Component } from 'react';
import './App.css';
import io from 'socket.io-client';

import Header from './components/Header';
import Menu from './components/Menu';
import Home from './components/Home';
import Lobby from './components/Lobby';
import Game from './components/Game';
import Modal from './components/Modal';
import Popup from './components/Popup';

const socket = io();

class App extends Component {
  constructor() {
    super();

    this.state = {
      name: '',
      roomCode: '',
      cards: [],
      blackCard: null,
      currentScreen: 'home',
      players: [],
      cardCzar: false,
      cardCzarName: '',
      gameStarted: false,
      playedCount: 0,
      cardSelection: {},
      playerSelections: null,
      winningCards: [],
      message: '',
      modalMessage: '',
      popupMessage: '',
      modalButtons: null,
      showMenu: false,
      showModal: false,
      showPopup: false,
      joiningGame: false,
    }

    this.handleInputChange = this.handleInputChange.bind(this);
    this.handleCardSelection = this.handleCardSelection.bind(this);
    this.handleCardSelectionSubmit = this.handleCardSelectionSubmit.bind(this);
    this.createGame = this.createGame.bind(this);
    this.joinGame = this.joinGame.bind(this);
    this.startGame = this.startGame.bind(this);
    this.leaveGame = this.leaveGame.bind(this);
    this.confirmLeaveGame = this.confirmLeaveGame.bind(this);
    this.readyUp = this.readyUp.bind(this);
    this.toggleMenu = this.toggleMenu.bind(this);
    this.closeModal = this.closeModal.bind(this);
    this.submitCzarSelection = this.submitCzarSelection.bind(this);
    this.readyForReset = this.readyForReset.bind(this);
    this.setMessage = this.setMessage.bind(this);
    this.toggleJoiningGame = this.toggleJoiningGame.bind(this);
  }

  componentDidMount() {
    socket.connect();

    socket.on('connected', (data) => {
      console.log('connected');
    })

    socket.on('joined', (data) => {
 
      this.setState((prevState) => {
        let newCurrentScreen;
        if (prevState.currentScreen === 'lobby') {
          newCurrentScreen = 'game';
        }
        return {
          cards: data.cards,
          roomCode: data.roomCode,
          showModal: false,
          currentScreen: newCurrentScreen || 'lobby',
          joiningGame: false,
        }
      })
    })

    socket.on('name taken', () => {
      console.log('name taken')
      this.setMessage('your name is not as clever as you think. enter different name.', 'popup', 2000)
      this.setState({
        joiningGame: false
      })
    })

    socket.on('bad roomcode', () => {
      console.log('bad roomcode');
      this.setMessage('bad roomcode, asshole!', 'popup', 2000);
    });

    socket.on('room full', () => {
      console.log('fuck off, room full');
      this.setMessage('this room is full! go play with yourself', 'popup', 2000);
    });

    socket.on('game in progress', (data) => {
      this.setMessage('Game in progress, my dude. Hold on.', 'modal');
      this.setState({
        roomCode: data.roomCode,
        currentScreen: 'lobby',
        joiningGame: false,
        cardCzarName: data.cardCzarName,
        showModal: true,
        modalCallback: null
      })
    })

    socket.on('need more players', () => {
      if (this.state.currentScreen === 'lobby') {
        this.setMessage('waiting for more players', 'popup', 2000);
      } else if (this.state.currentScreen === 'game') {
        let cardSelection = Object.assign({}, this.state.cardSelection);
        let cards = Object.assign([], this.state.cards);
        if (Object.keys(cardSelection).length > 0) {
          for (let text in cardSelection) {
            cards.push(text);
          }
        }
        this.setState({
          currentScreen: 'lobby',
          showModal: true,
          modalMessage: 'Not enough players',
          modalButtons: [{
            text: 'OK',
            callback: this.closeModal
          }],
          blackCard: null,
          cardCzar: false,
          cardCzarName: null,
          cardSelection: {},
          cards,
        })
      }
      
    })

    socket.on('update players', (data) => {
      console.log('receiving players');
      this.setState({
        players: data.players
      })
    });

    socket.on('start game', (data) => {
      this.setState({
        currentScreen: 'game',
        cardCzarName: data.cardCzarName,
        message: `waiting on ${data.cardCzarName} to read their card`,
      });
    })

    socket.on('card czar', (data) => {
      console.log('you are the card czar!');
      this.setState({
        cardCzar: true,
        blackCard: data.blackCard,
        message: 'Read the card aloud and then press START',
      })
    });

    socket.on('pick your cards', (data) => {
      if (this.state.currentScreen === 'game') {
        console.log(`pick ${data.blackCard.pick} of your cards!`);
        this.setState({
          blackCard: data.blackCard,
          gameStarted: true,
          message: `pick ${data.blackCard.pick} of your cards`,
        })
      }
    });

    socket.on('player submitted', (data) => {
      if (this.state.currentScreen === 'game') {
        let playersLeftToPlay = (this.state.players.length - 1) - data.playedCount;
        let message;

        if (playersLeftToPlay === 0) {
          message = 'waiting on czar to choose'
        } else if (playersLeftToPlay > 0 && (Object.keys(this.state.cardSelection).length !== 0 || this.state.cardCzar)) {
          message = `waiting on ${playersLeftToPlay} horrible `
          if (playersLeftToPlay > 1) {
            message += 'people'
          } else {
            message += 'person'
          }
        } else {
          message = this.state.message;
        }

        this.setState({
          playedCount: data.playedCount,
          message
        })
      }
    });

    socket.on('czar chooses', (data) => {
      console.log(`czar received ${data.playerSelections}`);
      this.setState({
        playerSelections: data.playerSelections,
        message: '',
      })
    });

    socket.on('a winner is', (data) => {
      console.log(`teh winnar is ${data.winner.name}!!`);
      this.setState({
        winningCards: data.winningCards,
        showModal: true,
        modalButtons: [{
          text: 'OK',
          callback: this.readyForReset
        }],
        gameStarted: false,
        cardSelection: {},
      })
  
      if (data.winner.id === socket.id) {
        this.setMessage(`You are ${this.state.cardCzarName}'s favorite.`, 'modal')
      } else if (this.state.cardCzar) {
        this.setMessage(`${data.winner.name} is your favorite`, 'modal')
      } else {
        this.setMessage(`${this.state.cardCzarName} hates you. Specifically you.`, 'modal')
      }
    })

    socket.on('refill white cards', (data) => {
      this.setState({
        cards: data.cards
      })
    })

    socket.on('disconnect', () => {
      socket.connect();
    })

  }

  createGame() {
    if (this.state.name.length > 0) {
      console.log(`${this.state.name} creating game`);
      socket.emit('create', {name: this.state.name});
    } else {
      this.setMessage('you forgot to enter a name, genius', 'popup')
    }
  }

  joinGame() {
    if (this.state.roomCode.length > 0) {
      console.log(`${this.state.name} joining game ${this.state.roomCode}`);
      socket.emit('join', {name: this.state.name, roomCode: this.state.roomCode});
    } else {
      this.setMessage('room codes are five digits long. can you count to five?', 'popup');
    }
  }

  toggleJoiningGame() {
    if (this.state.name.length > 0){
      this.setState((prevState) => {
        return {
          joiningGame: !prevState.joiningGame
        }
      })
    } else {
      this.setMessage('you forgot to enter a name, genius', 'popup', 2000)
    }
  }

  startGame() {
    console.log('let\'s start this shit');
    socket.emit('czar ready', {blackCard: this.state.blackCard, roomCode: this.state.roomCode});
    this.setState({
      gameStarted: true,
      message: `waiting on ${this.state.players.length - 1} horrible people`,
    });
  }

  confirmLeaveGame() {
    socket.emit('leave game', {roomCode: this.state.roomCode});
    this.setState({
      roomCode: '',
      cards: [],
      blackCard: null,
      currentScreen: 'home',
      players: [],
      cardCzar: false,
      cardCzarName: '',
      gameStarted: false,
      playedCount: 0,
      cardSelection: {},
      playerSelections: null,
      winningCards: [],
      message: '',
      modalMessage: '',
      modalCallback: null,
      showMenu: false,
      showModal: false,
    })
  }

  leaveGame() {
    this.setState({
      showModal: true,
      showMenu: false,
      modalMessage: 'Too real for you, huh?',
      modalButtons: [{
        text: 'Yes.',
        callback: this.confirmLeaveGame
      },
      {
        text: 'No.',
        callback: this.closeModal
      }
      ]
    })
  }

  closeModal() {
    this.setState({
      showModal: false,
      modalMessage: '',
      modalButtons: null
    })
  }

  handleInputChange(event) {
    let name = event.target.name;
    let value = event.target.value;
    this.setState({
      [name]: value
    });
  }

  setScreen(screen) {
    this.setState({
      currentScreen: screen,
      showMenu: false,
    })
  }

  setMessage(message, type = null, timeout = 2000) {
    switch(type) {
      case 'modal':
        this.setState({
          modalMessage: message
        });
        break;
      case 'popup':
        this.setState({
          popupMessage: message,
          showPopup: true,
        });
        setTimeout(() => {
          this.setState({
            popupMessage: '',
            showPopup: false,
          })
        }, timeout)
        break;
      default:
        this.setState({
          message
        });
    }
  }

  toggleMenu() {
    this.setState((prevState) => {
      return {
        showMenu: !prevState.showMenu
      }
    })
  }

  readyUp() {
    socket.emit('player ready', {roomCode: this.state.roomCode});
  }

  handleCardSelection(text) {
    let cardSelection = Object.assign({}, this.state.cardSelection);
    let cards = Object.assign([], this.state.cards);

    if (!cardSelection[text]) {
      if (Object.keys(cardSelection).length < this.state.blackCard.pick) {
        let i = 1;

        while (Object.values(cardSelection).indexOf(i) > -1) {
          i++;
        }

        cardSelection[text] = i;
        cards.splice(cards.indexOf(text), 1);

      } else {
        console.log('selected too many cards');
      }
    } else {
      console.log(`deleting ${text}`);
      delete cardSelection[text];
      cards.push(text);
    }

    this.setState({
      cardSelection,
      cards
    })
  }

  handleCardSelectionSubmit() {
    let sortableSelection = [];
    let cardSelection = Object.assign({}, this.state.cardSelection);

    for (let text in cardSelection) {
      sortableSelection.push([text, cardSelection[text]]);
    }

    let sortedSelection = sortableSelection
      .sort((a, b) => {
        return a[1] - b[1];
      })
      .map((card) => {
        return card[0]
      });

    socket.emit('card submit', {
      roomCode: this.state.roomCode,
      cardSelection: sortedSelection,
    })

    this.setState({
      gameStarted: false,
      message: 'waiting for other players'
    })
  }

  submitCzarSelection(index) {
    console.log(`I, the CZAR, have chosen ${this.state.playerSelections[index]}!!`);
    socket.emit('czar has chosen', {
      czarChoice: this.state.playerSelections[index], 
      blackCard: this.state.blackCard,
      roomCode: this.state.roomCode,
    });
    this.setState({
      playerSelections: null,
    })
  }

  readyForReset() {
    this.setState({
      showModal: false,
      modalMessage: '',
      modalCallback: null,
      cardCzar: false,
      cardCzarName: '',
      blackCard: null,
      playedCount: 0,
      message: 'waiting for reset'
    })

    socket.emit('next round', { roomCode: this.state.roomCode })
  }

  render() {
    const {
      name,
      cards,
      roomCode,
      currentScreen,
      players,
      cardCzar,
      cardCzarName,
      blackCard,
      gameStarted,
      playedCount,
      cardSelection,
      playerSelections,
      message,
      modalMessage,
      popupMessage,
      modalButtons,
      showMenu,
      showModal,
      showPopup,
      winningCards,
      joiningGame
    } = this.state;
    
    return (
      <div className='App'>
        <Header showMenu={showMenu} toggleMenu={this.toggleMenu} name={name} />
        {showModal &&
          <Modal
            message={modalMessage}
            buttons={modalButtons}
          />}
        {showMenu && 
          <Menu 
            leaveGame={this.leaveGame}
            roomCode={roomCode}
            currentScreen={currentScreen}
            winningCards={winningCards}
            players={players}
          />}
        {showPopup &&
          <Popup popupMessage={popupMessage} />
        }
        {currentScreen === 'home' && 
          <Home 
            name={name}
            roomCode={roomCode}
            handleInputChange={this.handleInputChange}
            createGame={this.createGame}
            joinGame={this.joinGame}
            message={message}
            joiningGame={joiningGame}
            toggleJoiningGame={this.toggleJoiningGame}
          />}
        {currentScreen === 'lobby' && 
          <Lobby 
            name={name}
            roomCode={roomCode}
            players={players}
            readyUp={this.readyUp}
            message={message}
          />}
        {currentScreen === 'game' && 
          <Game 
            cardCzar={cardCzar}
            cardCzarName={cardCzarName}
            blackCard={blackCard}
            cards={cards}
            players={players}
            playedCount={playedCount}
            startGame={this.startGame}
            gameStarted={gameStarted}
            cardSelection={cardSelection}
            playerSelections={playerSelections}
            submitCzarSelection={this.submitCzarSelection}
            handleCardSelection={this.handleCardSelection}
            handleCardSelectionSubmit={this.handleCardSelectionSubmit}
            message={message}
          />}
      </div>
    );
  }
}

export default App;
