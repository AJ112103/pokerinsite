import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { getAuth, onAuthStateChanged } from "firebase/auth";

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
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, user => {
      if (user) {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
    });

    // Clean up the subscription on unmount
    return () => unsubscribe();
  }, []);

  return (
    <>
      {location.pathname !== '/' && <Navbar />}
      
      <Routes>
        <Route path="/" element={isAuthenticated ? <Navigate to="/add-session" /> : <Login />} />
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
          path="/hand-insights/:sessionId" 
          element={
              <HandInsights />
          } 
        />
        <Route 
          path="/player-insights/:sessionId" 
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
          path="/hand-insights/:sessionId/:handNumber" 
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

