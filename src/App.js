import React from 'react';
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Home from './Home';
import About from './About';
import Login from './Login';
import GameAnalysis from './GameAnalysis';
import Bankroll from './Bankroll';
import User from './user';
import PrivateRoute from './PrivateRoute';
import HandInsights from './HandInsights';
import PlayerInsights from './PlayerInsights';
import PaymentSuccess from './PaymentSuccess';
import PaymentFailure from './PaymentFailure';
import RouletteLoader from './RouletteLoader';
import SpecificHandInsights from './SpecificHandInsights';

function App() {
  const location = useLocation();

  return (
    <>
      {/* Conditionally render the Navbar based on the current path */}
      {location.pathname !== '/' && <Navbar />}
      
      <Routes>
        <Route path="/" element={<Login />} />
        <Route 
          path="/add-session" 
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
        <Route
          path="/user" 
          element={
              <User />}  
        /> 
        <Route 
          path="/hand-insights" 
          element={
              <HandInsights />
          } 
        />
        <Route 
          path="/player-insights" 
          element={
              <PlayerInsights />
          } 
        />
        <Route 
          path="/payment-success" 
          element={
              <PaymentSuccess />
          } 
        />
      <Route 
          path="/payment-failure" 
          element={
              <PaymentFailure />
          } 
        />
        <Route 
          path="/hand-insights" 
          element={
              <HandInsights />
          } 
        />
        <Route 
          path="/hand-insights/:handNumber" 
          element={
              <SpecificHandInsights 
              />}
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

