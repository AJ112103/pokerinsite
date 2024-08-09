import React from 'react';
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Home from './Home';
import About from './About';
import Login from './Login';
import GameAnalysis from './GameAnalysis';
import Bankroll from './Bankroll';
import PrivateRoute from './PrivateRoute';

function App() {
  const location = useLocation();

  return (
    <>
      {/* Conditionally render the Navbar based on the current path */}
      {location.pathname !== '/' && <Navbar />}
      
      <Routes>
        <Route path="/" element={<Login />} />
        <Route 
          path="/home" 
          element={
            <PrivateRoute>
              <Home />
            </PrivateRoute>
          } 
        />
        <Route 
          path="/about" 
          element={
            <PrivateRoute>
              <About />
            </PrivateRoute>
          } 
        />
        <Route 
          path="/game-analysis" 
          element={
            <PrivateRoute>
              <GameAnalysis />
            </PrivateRoute>
          } 
        />
        <Route 
          path="/bankroll" 
          element={
            <PrivateRoute>
              <Bankroll />
            </PrivateRoute>
          } 
        />
      </Routes>
    </>
  );
}

function AppWrapper() {
  return (
    <Router>
      <App />
    </Router>
  );
}

export default AppWrapper;
