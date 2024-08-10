import React from 'react';
import './SubscriptionPopup.css';

const SubscriptionPopup = ({ onClose }) => {
  return (
    <div className="popup-overlay">
      <div className="popup-content">
        <h2>Enhance Your Experience</h2>
        <p>
          Unlock premium features to maximize your poker winnings. 
          For just $5/month:
        </p>
        <ul>
          <li>Track your bankroll</li>
          <li>Understand how you play</li>
          <li>Understand how your freinds play</li>
          <li>Find out who is the biggest fish on you table</li>
          <li>Find out who is the biggest nit on you table</li>
        </ul>
        <button className="subscribe-button">Subscribe Now</button>
        <button className="close-button" onClick={onClose}>Maybe Later</button>
      </div>
    </div>
  );
};

export default SubscriptionPopup;