import React, { useState, useEffect } from 'react';
import './GameAnalysis.css';
import { useNavigate } from 'react-router-dom';

const GameAnalysis = () => {
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);

  useEffect(() => {
    // Sample data mimicking backend response
    const sampleData = [
      {
        id: 1,
        name: 'Online Session #1',
        date: 'July 24th, 2024',
        netScore: -200,
        handsAnalyzed: 750,
        handsWon: 180,
        biggestFish: 'Player 5',
        biggestShark: 'Player 2',
        biggestNit: 'Player 7'
      },
      {
        id: 2,
        name: 'Online Session #2',
        date: 'August 3rd, 2024',
        netScore: 573,
        handsAnalyzed: 892,
        handsWon: 204,
        biggestFish: 'Player 3',
        biggestShark: 'Player 2',
        biggestNit: 'Player 8'
      },
      {
        id: 3,
        name: 'Offline Session #1',
        date: 'August 10th, 2024',
        netScore: 1200,
        handsAnalyzed: 320,
        handsWon: 98,
        biggestFish: 'Player 1',
        biggestShark: 'Player 4',
        biggestNit: 'Player 6'
      }
    ];

    // Simulating an API call
    setTimeout(() => {
      setSessions(sampleData);
    }, 500);
  }, []);

  const handleSessionClick = (session) => {
    setSelectedSession(session);
  };

  const closeModal = () => {
    setSelectedSession(null);
  };

  const navigate = useNavigate();

  const handlePlayerInsightsClick = () => {
    navigate('/player-insights');
  };

  const handleHandInsightsClick = () => {
    navigate('/hand-insights');
  };

  return (
    <div className="game-analysis-container">
      <h2>Sessions With Generated Insights</h2>
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Session Name</th>
              <th>Date</th>
              <th>Net Score</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((session) => (
              <tr key={session.id} onClick={() => handleSessionClick(session)}>
                <td class="underline">{session.name}</td>
                <td>{session.date}</td>
                <td style={{ color: session.netScore >= 0 ? 'green' : 'red' }}>
                  {session.netScore >= 0 ? '+' : ''}{session.netScore}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {selectedSession && (
        <div className="modal">
          <div className="modal-content">
            <span className="close-button" onClick={closeModal}>&times;</span>
            <h3>Game At A Glance</h3>
            <h4>{selectedSession.name}</h4>
            <div className="game-stats">
              <div>
                <p>Hands Analyzed</p>
                <strong>{selectedSession.handsAnalyzed}</strong>
              </div>
              <div>
                <p>Your Net Score</p>
                <strong style={{ color: selectedSession.netScore >= 0 ? 'green' : 'red' }}>
                  {selectedSession.netScore >= 0 ? '+' : ''}{selectedSession.netScore}
                </strong>
              </div>
              <div>
                <p>Hands Won</p>
                <strong>{selectedSession.handsWon}</strong>
              </div>
            </div>
            <div className="player-stats">
              <div>
                <p>Biggest Fish</p>
                <strong>{selectedSession.biggestFish}</strong>
              </div>
              <div>
                <p>Biggest Shark</p>
                <strong>{selectedSession.biggestShark}</strong>
              </div>
              <div>
                <p>Biggest Nit</p>
                <strong>{selectedSession.biggestNit}</strong>
              </div>
            </div>
            <div className="button-group">
            <button onClick={handlePlayerInsightsClick}>Player Insights</button>
            <button onClick={handleHandInsightsClick}>Hand Insights</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameAnalysis;