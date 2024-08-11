import React from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import './SubscriptionPopup.css';

function SubscriptionPopup({ onClose, uploadsLeft }) {
  const handleSubscribe = async () => {
    const functions = getFunctions();
    const createStripeSession = httpsCallable(functions, 'createStripeSession');

    createStripeSession().then(({ data }) => {
        window.location.href = `${data.sessionId}`;
    }).catch(error => {
      console.error('Error creating Stripe session:', error);
      alert('There was an issue initiating your payment. Please try again.');
    });
  };

  return (
    <div className="popup-overlay">
      <div className="popup-content">
        <h2>Enhance Your Experience</h2>
        <p>
          You have {uploadsLeft} upload(s) left.
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
        <button className="subscribe-button" onClick={handleSubscribe}>
          Subscribe Now
        </button>
        <button className="later-button" onClick={onClose}>Maybe Later</button>
      </div>
    </div>
  );
}

export default SubscriptionPopup;