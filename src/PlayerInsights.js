import React, { useState, useEffect } from 'react';
import './PlayerInsights.css';

const PlayerInsights = () => {
  const [playerData, setPlayerData] = useState({});

  useEffect(() => {
    // Sample data mimicking backend response
    const sampleData = {
      netScore: 150,
      handsPlayed: 300,
      amountWon: 1000,
      amountLost: 850,
      flopsSeen: '50%',
      turnsSeen: '40%',
      riversSeen: '30%',
      handsWon: '20%'
    };

    // Simulating an API call
    setTimeout(() => {
      setPlayerData(sampleData);
    }, 500);
  }, []);

   // useEffect(() => {
  //   fetchPlayerData();
  // }, []);

  // const fetchPlayerData = async () => {
  //   try {
  //     const functions = getFunctions();
  //     const getPlayerData = httpsCallable(functions, 'getPlayerData');
  //     const result = await getPlayerData();
  //     setPlayerData(result.data.entries.map(entry => ({
  //           netScore: entry.netScore,
            // handsPlayed: entry.,
            // amountWon: 1000,
            // amountLost: 850,
            // flopsSeen: '50%',
            // turnsSeen: '40%',
            // riversSeen: '30%',
            // handsWon: '20%'
  //     })));
  //   } catch (error) {
  //     console.error('Error fetching Hand data:', error);
  //   }
  // };
  

  return (
    <div className="player-insights-container">
      <h2>Player 1</h2>
      <h3>Player Insights</h3>
      <table class="table-player">
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
            <td className={playerData.netScore >= 0 ? 'positive' : 'negative'}>
              {playerData.netScore}
            </td>
            <td>{playerData.handsPlayed}</td>
            <td>{playerData.amountWon}</td>
            <td>{playerData.amountLost}</td>
          </tr>
        </tbody>
      </table>
      <table class="table-player">
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
            <td>{playerData.flopsSeen}</td>
            <td>{playerData.turnsSeen}</td>
            <td>{playerData.riversSeen}</td>
            <td>{playerData.handsWon}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default PlayerInsights;
