import React, { useState, useEffect } from 'react';
import './GameAnalysis.css';
import { useNavigate } from 'react-router-dom';
import { getFunctions, httpsCallable } from 'firebase/functions';

const GameAnalysis = () => {
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const functions = getFunctions();
    const getAllSessionDetails = httpsCallable(functions, 'getAllSessionDetails');

    getAllSessionDetails().then((result) => {
      console.log(result);
      const sessionsFromApi = result.data.details.map(session => ({
        id: session.sessionId,
        name: session.sessionName,
        date: session.date,
        netScore: session.yourNet,
        handsAnalyzed: session.glance.hands_analyzed,
        handsWon: session.glance.hands_won,
        biggestFish: session.glance.fish,
        biggestShark: session.glance.shark,
        biggestNit: session.glance.nit
      }));
      setSessions(sessionsFromApi);
    }).catch((error) => {
      console.error("Failed to fetch session details:", error);
      // Handle errors or set default data here if necessary
    });
  }, []);

  const handleSessionClick = (session) => {
    setSelectedSession(session);
  };

  const closeModal = () => {
    setSelectedSession(null);
  };

  const handlePlayerInsightsClick = () => {
    if (selectedSession) {
      navigate(`/player-insights/${selectedSession.id}`);
    } else {
      console.error('No session selected');
    }
  };
  

  const handleHandInsightsClick = () => {
    if (selectedSession) {
      console.log("here");
      navigate(`/hand-insights/${selectedSession.id}`);
    } else {
      console.error('No session selected');
    }
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
                <td className="underline">{session.name}</td>
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
