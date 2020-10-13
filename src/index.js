import Controller from './components/controller';
const React = require('react');
const ReactDom = require('react-dom');
const root = document.getElementById('root');

ReactDom.render(<Controller address='10.0.0.6:8080' />, root);
