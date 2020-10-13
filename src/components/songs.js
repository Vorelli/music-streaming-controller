import React, { Component } from 'react';
const makeCancellable = require('../makeCancellable');

class Songs extends Component {
  constructor(props) {
    super(props);

    this.state = {
      songs: props.getSongs(),
      view: 'artistAlbum',
      sorted: null
    };

    this.state.songs.then(() => this.sortSongs());
  }

  componentWillUnmount() {
    if (this.state.songs) {
      this.state.songs.cancel();
      this.state.songs.promise.catch((err) => {
        if (err.message !== 'cancelled') console.error(err);
      });
    }
  }

  componentDidMount() {
    /* document.addEventListener('click', (ev) => console.log(ev));
    document.addEventListener('contextmenu', (ev) => {
      ev.preventDefault();
      console.log(ev);
    }); */
  }

  addSongToItsPath(song, sortedByFolder) {
    const pathWithoutFileName = song.path
      .replace(/[0-Za-z' -.]*\.mp3$/, '')
      .trim();
    const paths = pathWithoutFileName
      .split('\\')
      .filter((value) => value !== '');
    paths.forEach((path, index, a) => {
      let lastMap = sortedByFolder;
      for (let i = 0; i < index; i++) {
        const lastMapValues = lastMap.get(a[i]);
        const mapInValues = lastMapValues.filter(
          (value) => value.constructor === new Map().constructor
        )[0];
        lastMap = mapInValues;
      }

      const goingToStoreMD5 = index === paths.length - 1;
      // last folder in the path so we need to add the song's MD5

      if (goingToStoreMD5) {
        // just adding this song's MD5 to this path's array
        // goes from the lastmap to this path's array
        // which can contain strings and A SINGULAR map
        // the strings are songs' MD5s and the map
        // continues the directory
        this.addToHashMap(lastMap, path, song.md5);
      } else {
        const lastMapValues = lastMap.get(path);
        const findMap = (value) => value.constructor === new Map().constructor;
        if (!lastMapValues || lastMapValues.filter(findMap)[0] === undefined) {
          // basically if there is no array that this path points to
          // OR
          // there is no map within the values of the array
          // then add an empty one
          this.addToHashMap(lastMap, path, new Map());
        }
      }
    });
  }

  addSongToArtistAlbum(song, sortedByArtistAlbum) {
    let artistMap = sortedByArtistAlbum.get(song.tags.artist);
    if (!artistMap) {
      // artist not pointing to a map
      artistMap = new Map();
      sortedByArtistAlbum.set(song.tags.artist, artistMap);
    }
    this.addToHashMap(artistMap, song.tags.album, song.md5);
  }

  addToHashMap(map, key, value) {
    let currentArray = map.get(key);
    currentArray = currentArray || [];
    currentArray.push(value);
    map.set(key, currentArray);
  }

  sortSongs() {
    const sortedByArtist = new Map();
    const sortedByYear = new Map();
    const sortedByGenre = new Map();
    const sortedByAlbum = new Map();
    const sortedByFolder = new Map();
    const sortedByArtistAlbum = new Map();
    const md5ToSong = new Map();

    this.state.songs.then((songs) => {
      songs.forEach((song) => {
        md5ToSong.set(song.md5, song);

        this.addToHashMap(sortedByArtist, song.tags.artist, song.md5);
        this.addToHashMap(sortedByYear, song.tags.year, song.md5);
        this.addToHashMap(sortedByGenre, song.tags.genre, song.md5);
        this.addToHashMap(sortedByAlbum, song.tags.album, song.md5);
        this.addSongToItsPath(song, sortedByFolder);
        this.addSongToArtistAlbum(song, sortedByArtistAlbum);
      });
      // sortedByArtistAlbum.forEach((value, key) => console.log(key, value));

      this.setState({
        sorted: {
          album: sortedByAlbum,
          artist: sortedByArtist,
          artistAlbum: sortedByArtistAlbum,
          folder: sortedByFolder,
          genre: sortedByGenre,
          year: sortedByYear,
          md5ToSong
        }
      });
    });
  }

  songFromMD5(md5) {
    return (
      <li key={md5}>
        <span className='songTitle'>
          {this.state.sorted.md5ToSong[md5].title}
        </span>
      </li>
    );
  }

  generateTreeRecursive(key, map) {
    const keyValues = map.get(key);
    if (keyValues) {
      let arrayWithoutMap = keyValues;
      const listElements = [];

      let mapInArray;
      const keyValuesIsAMap = keyValues.constructor === new Map().constructor;
      if (keyValuesIsAMap) {
        mapInArray = keyValues;
      } else {
        mapInArray = keyValues.filter(
          (v) => v.constructor === new Map().constructor
        )[0];
      }

      if (mapInArray) {
        if (!keyValuesIsAMap) {
          const indexOfMap = keyValues.indexOf(mapInArray);
          arrayWithoutMap = [
            ...keyValues.slice(0, indexOfMap),
            ...keyValues.slice(indexOfMap + 1)
          ];
        }
        mapInArray.forEach((value, key) => {
          listElements.push(this.generateTreeRecursive(key, mapInArray));
        });
      }

      let songElements = [];
      if (!keyValuesIsAMap) {
        songElements = arrayWithoutMap.map((md5) => {
          return (
            <li
              className='song'
              key={md5}
              draggable={true}
              onDragStart={(ev) => this.dragStart(ev, false, md5)}
              onContextMenu={(ev) => this.liClick(ev, false, md5)}
            >
              {this.state.view === 'folder'
                ? this.state.sorted.md5ToSong.get(md5).path.replace(/.*\\/, '')
                : this.state.sorted.md5ToSong.get(md5).tags.title}
            </li>
          );
        });
      }

      return (
        <li
          className='subElement'
          key={key}
          draggable={true}
          onClick={this.showHideChildren}
          onDragStart={(ev) => this.dragStart(ev, true, key, map)}
          onDragEnd={(ev) => this.dragEnd(ev)}
          onMouseOver={(ev) => this.mouseOver(ev)}
          onMouseOut={(ev) => this.mouseOut(ev)}
          onContextMenu={(ev) => this.liClick(ev, true, key, map)}
        >
          {key}
          <ul className='subtree' style={{ display: 'none' }}>
            {[...listElements, ...songElements]}
          </ul>
        </li>
      );
    }
  }

  liClick(ev, isMap, key, map) {
    ev.preventDefault();
    ev.stopPropagation();
    console.log(ev.pageX, ev.pageY);
    console.log(isMap, key, map);

    const context = document.createElement('div');
    context.style.position = 'absolute';
    context.style.left = ev.pageX + 'px';
    context.style.top = ev.pageY + 'px';
    context.style.backgroundColor = 'grey';
    context.style.width = '100px';
    context.style.height = '100px';

    const fun = (ev) => {
      if (ev.target !== context) {
        document.body.removeChild(context);
        document.removeEventListener('click', fun);
        document.removeEventListener('contextmenu', fun);
      }
    };
    document.addEventListener('contextmenu', fun);
    document.addEventListener('click', fun);
    document.body.appendChild(context);
  }

  showHideChildren(event) {
    event.stopPropagation();
    const children = event.target.children;
    if (
      children.length === 1 &&
      event.target.classList.contains('subElement')
    ) {
      const isHidden = children[0].style.display === 'none';
      const subList = children[0];
      // this is a list which should be expanded
      // or hidden based on its status
      subList.style.display = isHidden ? 'block' : 'none';
      isHidden
        ? event.target.classList.add('expanded')
        : event.target.classList.remove('expanded');
    }
  }

  dragStart(event, isMap, key, map = undefined) {
    event.stopPropagation();
    event.dataTransfer.setData('isMap', isMap);
    event.dataTransfer.setData('key', key);
    event.dataTransfer.setData('map', map);
    event.dataTransfer.effectAllowed = 'copy';
    event.target.style.backgroundColor = '#0093ff';
  }

  dragEnd(event) {
    event.stopPropagation();
    event.target.style.backgroundColor = '';
    event.target.classList.remove('hover');
  }

  mouseOver(event) {
    event.stopPropagation();
    event.target.classList.add('hover');
  }

  mouseOut(event) {
    event.stopPropagation();
    event.target.classList.remove('hover');
  }

  setSort(view) {
    this.setState({ view });
  }

  render() {
    const subTrees = [];

    if (this.state.sorted) {
      const unsortedMap = this.state.sorted[this.state.view];
      const ordered = new Map();
      let keys = [];
      unsortedMap.forEach((_, k) => keys.push(k));
      keys = keys.sort();
      keys.forEach((key) => ordered.set(key, unsortedMap.get(key)));

      ordered.forEach((_, key, arr) => {
        subTrees.push(this.generateTreeRecursive(key, arr));
      });
    }

    return (
      <div className='songView'>
        <div className='topBar'>
          <button onClick={this.setSort.bind(this, 'genre')}>
            <i className='fas fa-guitar'></i>
          </button>
          <button onClick={this.setSort.bind(this, 'artist')}>
            <i className='fas fa-user'></i>
          </button>
          <button onClick={this.setSort.bind(this, 'album')}>
            <i className='fas fa-compact-disc'></i>
          </button>
          <button onClick={this.setSort.bind(this, 'artistAlbum')}>
            <i className='fas fa-user-tag'></i>
          </button>
          <button onClick={this.setSort.bind(this, 'year')}>
            <i className='fas fa-glass-cheers'></i>
          </button>
          <button onClick={this.setSort.bind(this, 'folder')}>
            <i className='fas fa-folder'></i>
          </button>
        </div>
        <ul className='tree'>{subTrees}</ul>
      </div>
    );
  }
}

export default Songs;
