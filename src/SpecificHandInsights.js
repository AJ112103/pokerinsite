import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './SpecificHandInsights.css';

const sampleData = [
  { handNumber: 1, yourHand: 'A♠ K♠', totalPot: 500, winner: 'Player 2', yourNet: -200, players: ['You', 'Player 2', 'Player 3'] },
  // ... (include all the sample data from HandInsights.js)
];

const SpecificHandInsights = () => {
  const { handNumber } = useParams();
  const navigate = useNavigate();
  const [handData, setHandData] = useState(null);
  const { sessionId } = useParams();

  useEffect(() => {
    // In a real application, you would fetch the specific hand data from your backend
    // For now, we'll use the sample data
    const specificHand = sampleData.find(hand => hand.handNumber === parseInt(handNumber));
    setHandData(specificHand);
  }, [handNumber]);

  if (!handData) {
    return <div>Loading...</div>;
  }

  return (
    <div className="specific-hand-insights">
      <h2>Hand #{handData.handNumber} Insights</h2>
      <div className="hand-details">
        <p><strong>Your Hand:</strong> {handData.yourHand}</p>
        <p><strong>Total Pot:</strong> ${handData.totalPot}</p>
        <p><strong>Winner:</strong> {handData.winner}</p>
        <p><strong>Your Net:</strong> <span className={handData.yourNet >= 0 ? 'positive' : 'negative'}>
          ${handData.yourNet}
        </span></p>
        <p><strong>Players:</strong> {handData.players.join(', ')}</p>
      </div>
      <div className="action-buttons">
        <button onClick={() => navigate(`/hand-insights/${sessionId}`)}>Back to Hand Insights</button>
        {/* Add more buttons for additional actions if needed */}
      </div>
    </div>
  );
};

export default SpecificHandInsights;