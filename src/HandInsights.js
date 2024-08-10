import React, { useState, useEffect } from 'react';
import './HandInsights.css';

const HandInsights = () => {
  const [handData, setHandData] = useState([]);

  useEffect(() => {
    // Sample data mimicking backend response
    const sampleData = [
      {
        handNumber: 1,
        yourHand: 'A♠ K♠',
        totalPot: 500,
        winner: 'Player 2',
        yourNet: 300
      }
    ];

    // Simulating an API call
    setTimeout(() => {
      setHandData(sampleData);
    }, 500);
  }, []);

  return (
    <div className="hand-insights-container">
      <h2>Online Session #2</h2>
      <h3>Hand Insights</h3>
      <table class="table-hand">
        <thead>
          <tr>
            <th>Hand Number</th>
            <th>Your Hand</th>
            <th>Total Pot</th>
            <th>Winner</th>
            <th>Your Net</th>
          </tr>
        </thead>
        <tbody>
          {handData.map((hand, index) => (
            <tr key={index}>
              <td>{hand.handNumber}</td>
              <td>{hand.yourHand}</td>
              <td>{hand.totalPot}</td>
              <td>{hand.winner}</td>
              <td className={hand.yourNet >= 0 ? 'positive' : 'negative'}>
                {hand.yourNet}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default HandInsights;
