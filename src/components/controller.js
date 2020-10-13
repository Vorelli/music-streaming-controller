import MusicPlayer from '@bit/vorelli.musicplayer.music-player';
import Controls from './controls';
import React, { Component } from 'react';
import '../../public/index.sass';
import makeCancellable from '../makeCancellable';
import Songs from './songs';

export default class Controller extends Component {
  constructor(props) {
    super();

    this.state = {
      address: props.address || 'localhost:8080',
      token: localStorage.getItem('token'),
      paused: false,
      authenticated: null,
      fetchPromises: {},
      draggingProgress: false,
      progressBar: null,
      newTime: null
    };

    if (this.state.token) {
      this.state.fetchPromises.authCheck = makeCancellable(
        new Promise((resolve, reject) => {
          fetch('http://' + this.state.address + '/control/authCheck', {
            mode: 'cors',
            headers: {
              Authorization: 'Bearer ' + this.state.token
            }
          })
            .then((response) => response.json())
            .then((response) => {
              resolve(response.authorized);
              this.setState({ authenticated: response.authorized });
            })
            .catch((err) => {
              reject(err);
            });
        })
      );
    } else {
      this.state.fetchPromises.authCheck = makeCancellable(Promise.resolve());
    }
  }

  componentDidMount() {
    this.state.fetchPromises.authCheck.promise.then(() => {
      if (!this.state.token || this.state.authenticated === false) {
        this.popupOverlay();
      }
    });

    this.setState({
      progressBar: document.querySelector('.playedBar')
    });

    document
      .querySelector('.playedBar')
      .addEventListener('mousedown', (event) => {
        this.setState({ draggingProgress: true });
        this.progressMouseDown(event);
      });
    document
      .querySelector('.playedBar')
      .addEventListener('mousemove', this.progressMouseDown.bind(this));
    document.addEventListener('mouseup', this.progressMouseUp.bind(this));
    document.addEventListener('mousemove', this.progressMouseMove.bind(this));
  }

  progressMouseDown(event) {
    if (!document.getElementById('follow')) {
      const followWithTime = document.createElement('div');
      followWithTime.id = 'follow';
      followWithTime.style.position = 'absolute';
      document.body.appendChild(followWithTime);
    }

    this.progressMouseMove(event);
  }

  progressMouseUp(event) {
    const follow = document.getElementById('follow');
    if (follow) {
      follow.remove();
    }

    if (this.state.draggingProgress) {
      const body = { time: Math.floor(this.state.newTime) };
      this.authorizedFetch(
        'http://' + this.state.address + '/control/time',
        'Successfully set the server to ' + body.time + ' milliseconds.',
        'time',
        JSON.stringify(body),
        'POST'
      );
    }
    this.setState({ draggingProgress: false });
  }

  progressMouseMove(event) {
    if (
      !(
        this.state.draggingProgress ||
        event.target.className === 'playedBarProgress' ||
        event.target.className === 'playedBar'
      )
    ) {
      this.progressMouseUp(event);
    }

    var scrollLeft =
      window.pageXOffset ||
      (document.documentElement || document.body.parentNode || document.body)
        .scrollLeft;

    var scrollTop =
      window.pageYOffset ||
      (document.documentElement || document.body.parentNode || document.body)
        .scrollTop;

    const offsetLeft =
      this.state.progressBar.offsetParent.offsetLeft -
      this.state.progressBar.offsetLeft -
      scrollLeft;
    const offsetFromLeft = this.state.progressBar.offsetWidth - scrollLeft;
    let x = event.clientX - offsetLeft;
    if (x < 0) x = 0;
    if (x > offsetFromLeft - scrollLeft) x = offsetFromLeft - scrollLeft;
    const progress = x / offsetFromLeft;
    const newTime = document.getElementById('audio').duration * progress * 1000;
    this.setState({ newTime });

    const follow = document.getElementById('follow');
    if (follow) {
      follow.style.left = event.clientX - scrollLeft + 'px';
      follow.style.top = event.clientY + scrollTop - 30 + 'px';
      follow.style.backgroundColor = 'grey';
      follow.style.zIndex = 2;
      follow.textContent = this.formatTime(newTime / 1000);
    }
  }

  formatTime(timeInSeconds) {
    const minutes = ~~(timeInSeconds / 60);
    const seconds = ~~(timeInSeconds % 60);
    const minutesString = minutes < 10 ? '0' + minutes : minutes;
    const secondsString = seconds < 10 ? '0' + seconds : seconds;
    return [minutesString, secondsString].join(':');
  }

  componentWillUnmount() {
    const keys = Object.keys(this.state.fetchPromises);

    keys.forEach((key) => {
      this.state.fetchPromises[key].cancel();
      this.state.fetchPromises[key].promise.catch((err) => err);
    });
  }

  async getSongs() {
    return new Promise((resolve, reject) => {
      this.state.fetchPromises.authCheck.promise.then((authenticated) => {
        if (authenticated) {
          this.authorizedFetch(
            'http://' + this.state.address + '/control/songs',
            "Here's the songs:",
            'songs'
          )
            .promise.then((response) => {
              if (response.songs) resolve(response.songs);
              reject(new Error('0 songs OR ERROR!!'));
            })
            .catch((err) => reject(err));
        }
      });
    });
  }

  getQueue() {
    return makeCancellable(
      new Promise((resolve, reject) => {
        this.state.fetchPromises.authCheck.then((authenticated) => {
          if (authenticated) {
            fetch('http://' + this.state.address + '/control/queue');
          }
        });
      })
    );
  }

  submitLoginForm(event) {
    event.preventDefault();
    const formData = new FormData(event.target);

    const loginFetch = makeCancellable(
      new Promise((resolve, reject) => {
        fetch('http://' + this.state.address + '/control/login', {
          body: formData,
          method: 'POST'
        })
          .then((response) => response.json())
          .then((response) => {
            if (response.token) {
              localStorage.setItem('token', response.token);
              window.location.reload();
              resolve(response.token);
            }
          })
          .catch((err) => reject(err));
      })
    );

    const state = this.state;
    state.fetchPromises.login = loginFetch;
    this.setState(state);
  }

  submitSignupForm(event) {}

  createLoginForm() {
    const form = document.createElement('form');
    form.onsubmit = this.submitLoginForm.bind(this);

    const usernameField = document.createElement('div');
    usernameField.className = 'form-group';
    const usernameInput = document.createElement('input');
    usernameInput.className = 'form-control';
    usernameInput.name = 'username';
    usernameInput.id = 'username';
    usernameInput.type = 'email';
    usernameInput.required = true;
    const usernameLabel = document.createElement('label');
    usernameLabel.htmlFor = 'username';
    usernameLabel.textContent = 'Username (email):';
    usernameField.appendChild(usernameLabel);
    usernameField.appendChild(usernameInput);

    const passwordField = document.createElement('div');
    passwordField.className = 'form-group';
    const passwordInput = document.createElement('input');
    passwordInput.className = 'form-control';
    passwordInput.name = 'password';
    passwordInput.id = 'password';
    passwordInput.type = 'password';
    passwordInput.required = true;
    const passwordLabel = document.createElement('label');
    passwordLabel.htmlFor = 'password';
    passwordLabel.textContent = 'Password:';
    passwordField.appendChild(passwordLabel);
    passwordField.appendChild(passwordInput);

    const submitButton = document.createElement('button');
    submitButton.textContent = 'Log in';
    submitButton.classList = ['btn btn-primary'];

    form.appendChild(usernameField);
    form.appendChild(passwordField);
    form.appendChild(submitButton);

    return form;
  }

  popupOverlay() {
    let overlay = document.querySelector('#overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'overlay';
      const formTitleContainer = document.createElement('div');
      formTitleContainer.className = 'formTitleContainer';
      overlay.appendChild(formTitleContainer);
      const title = document.createElement('h1');
      title.textContent = 'Login';
      formTitleContainer.appendChild(title);
      formTitleContainer.appendChild(this.createLoginForm());
      document.querySelector('.controller').appendChild(overlay);
    }
    overlay.style.display = 'block';
  }

  authorizedFetch(
    address,
    expectedMessages,
    key,
    body = undefined,
    method = 'GET'
  ) {
    const theFetch = makeCancellable(
      new Promise((resolve, reject) => {
        let headers;
        if (body) {
          headers = {
            Authorization: 'Bearer ' + this.state.token,
            'Content-Type': 'application/json'
          };
        } else {
          headers = {
            Authorization: 'Bearer ' + this.state.token
          };
        }
        fetch(address, {
          mode: 'cors',
          headers,
          body,
          method
        })
          .then((response) => response.json())
          .then((response) => {
            if (!expectedMessages.includes(response.message)) {
              throw new Error('unexpected failure!');
            }
            resolve(response);
            const state = this.state;
            state.fetchPromises.pausePlay = undefined;
            this.setState(state);
          })
          .catch((err) => reject(err));
      })
    );

    theFetch.promise.catch((err) => {
      if (err.message !== 'cancelled') console.error(err);
    });

    const state = this.state;
    state.fetchPromises[key] = theFetch;
    this.setState(state);

    return theFetch;
  }

  setPause(paused) {
    this.setState({ paused });
  }

  pausePlay() {
    this.authorizedFetch(
      'http://' + this.state.address + '/control/playpause',
      ['Successfully playing the song!', 'Successfully paused the song!'],
      'pausePlay'
    );
  }

  prev() {
    this.authorizedFetch(
      'http://' + this.state.address + '/control/prev',
      ['Successfully went to previous song! '],
      'prev'
    );
  }

  next() {
    this.authorizedFetch(
      'http://' + this.state.address + '/control/next',
      ['Successfully went to next song!'],
      'next'
    );
  }

  render() {
    return (
      <div className='controller'>
        <Controls
          paused={this.state.paused}
          next={this.next.bind(this)}
          prev={this.prev.bind(this)}
          pausePlay={this.pausePlay.bind(this)}
        />
        <MusicPlayer
          setPause={this.setPause.bind(this)}
          address={this.state.address}
        />
        <Songs getSongs={this.getSongs.bind(this)} />
      </div>
    );
  }
}
