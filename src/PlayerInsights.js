import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getFunctions, httpsCallable } from "firebase/functions";
import '@fortawesome/fontawesome-free/css/all.css';
import './PlayerInsights.css';
import RouletteLoader from './RouletteLoader';

const PlayerInsights = () => {
  const { sessionId } = useParams();
  const [players, setPlayers] = useState([]);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);

  useEffect(() => {
    const fetchPlayersData = async () => {
      const functions = getFunctions();
      const getPlayerData = httpsCallable(functions, 'getPlayerDetails'); // Replace 'getPlayerDetails' with your actual function name

      try {
        const response = await getPlayerData({ gameId: sessionId });
        if (response.data && response.data.players) {
          setPlayers(Object.entries(response.data.players)); // Store players as array of [key, value] pairs
          setCurrentPlayerIndex(0); // Start with the first player
        }
      } catch (error) {
        console.error('Error fetching player data:', error);
      }
    };

    if (sessionId) {
      fetchPlayersData();
    }
  }, [sessionId]);

  const handleNextPlayer = () => {
    setCurrentPlayerIndex((prevIndex) => (prevIndex + 1) % players.length);
  };

  const handlePreviousPlayer = () => {
    setCurrentPlayerIndex((prevIndex) => (prevIndex - 1 + players.length) % players.length);
  };

  if (!players.length) {
    return (
      <div className="player-insights-container"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <RouletteLoader />
      </div>
    );
  }

  const [playerName, playerData] = players[currentPlayerIndex];

  return (
    <div className="player-insights-container">
      <h3>Player Insights</h3>
      <div className="navigation">
        <button onClick={handlePreviousPlayer} className="arrow-btn"><i className="fas fa-chevron-left"></i></button>
        <div className="name-container">
          <h2>{playerName}</h2>
        </div>
        <button onClick={handleNextPlayer} className="arrow-btn"><i className="fas fa-chevron-right"></i></button>
      </div>
      <table className="table-player">
        <thead>
          <tr>
            <th>Net Score</th>
            <th>Hands Played</th>
            <th>Amount Won</th>
            <th>Amount Lost</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className={playerData.netscore >= 0 ? 'positive' : 'negative'}>
              {playerData.netscore}
            </td>
            <td>{playerData.hands_played}</td>
            <td>{playerData.amount_won}</td>
            <td>{playerData.amount_lost}</td>
          </tr>
        </tbody>
      </table>
      <table className="table-player">
        <thead>
          <tr>
            <th>% of Flops Seen</th>
            <th>% of Turns Seen</th>
            <th>% of Rivers Seen</th>
            <th>% of Hands Won</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{Math.round(playerData.flops / playerData.hands_played * 100)}%</td>
            <td>{Math.round(playerData.turns / playerData.hands_played * 100)}%</td>
            <td>{Math.round(playerData.rivers / playerData.hands_played * 100)}%</td>
            <td>{Math.round(playerData.hands_won / playerData.hands_played * 100)}%</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default PlayerInsights;
