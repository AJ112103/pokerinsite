import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Navbar from './Navbar';
import Home from './Home';
import GameAnalysis from './GameAnalysis';
import Bankroll from './Bankroll';

function App() {
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/game-analysis" element={<GameAnalysis />} />
        <Route path="/bankroll" element={<Bankroll />} />
      </Routes>
    </Router>
  );
}

export default App;
