import React from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser } from '@fortawesome/free-solid-svg-icons';
import './Navbar.css';

function Navbar() {
  return (
    <div className="navbar">
      <div className="logo">
        <Link to="/add-session">Pokerin.site</Link>
        beta
      </div>
      <div className="nav-links">
        <Link to="/add-session" className="nav-item">Add Session</Link>
        <Link to="/about" className="nav-item">About</Link>
        <Link to="/game-analysis" className="nav-item">Game Analysis</Link>
        <Link to="/bankroll" className="nav-item">Bankroll</Link>
      </div>
      <div className="user">
      <Link to="/user" className="navbar-link"><FontAwesomeIcon icon={faUser} className="user-icon" /></Link>
      </div>
    </div>
  );
}

export default Navbar;
