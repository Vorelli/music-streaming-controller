import React, { Component } from 'react';

export default function Controls(props) {
  const playPrev = !props.paused ? (
    <i className='fas fa-pause'></i>
  ) : (
    <i className='fas fa-play'></i>
  );
  return (
    <div className='controls'>
      <button className='prev'>
        <i className='fas fa-backward' onClick={props.prev}></i>
      </button>
      <button className='pausePlay' onClick={props.pausePlay}>
        {playPrev}
      </button>
      <button className='next'>
        <i className='fas fa-forward' onClick={props.next} />
      </button>
    </div>
  );
}
