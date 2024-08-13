import React, { useState, useEffect } from 'react';
import './HandInsights.css'

const sampleData = [
  { handNumber: 1, yourHand: 'A♠ K♠', totalPot: 500, winner: 'Player 2', yourNet: -200, players: ['You', 'Player 2', 'Player 3'] },
  { handNumber: 2, yourHand: 'Q♥ J♥', totalPot: 300, winner: 'You', yourNet: 300, players: ['You', 'Player 2', 'Player 3'] },
  { handNumber: 3, yourHand: '7♦ 7♣', totalPot: 800, winner: 'Player 3', yourNet: -400, players: ['You', 'Player 2', 'Player 3', 'Player 4'] },
  { handNumber: 4, yourHand: 'A♣ A♦', totalPot: 1000, winner: 'You', yourNet: 1000, players: ['You', 'Player 2', 'Player 3', 'Player 4'] },
  { handNumber: 5, yourHand: 'K♠ Q♠', totalPot: 600, winner: 'Player 4', yourNet: -300, players: ['You', 'Player 2', 'Player 3', 'Player 4'] },
  { handNumber: 6, yourHand: 'J♥ T♥', totalPot: 400, winner: 'Player 2', yourNet: -200, players: ['You', 'Player 2', 'Player 3'] },
  { handNumber: 7, yourHand: '9♣ 9♠', totalPot: 700, winner: 'You', yourNet: 700, players: ['You', 'Player 2', 'Player 3', 'Player 4'] },
  { handNumber: 8, yourHand: 'A♦ K♦', totalPot: 900, winner: 'Player 3', yourNet: -450, players: ['You', 'Player 2', 'Player 3', 'Player 4'] },
  { handNumber: 9, yourHand: 'Q♠ J♠', totalPot: 550, winner: 'You', yourNet: 550, players: ['You', 'Player 2', 'Player 3'] },
  { handNumber: 10, yourHand: '8♥ 8♦', totalPot: 350, winner: 'Player 4', yourNet: -175, players: ['You', 'Player 2', 'Player 3', 'Player 4'] },
];

const HandInsights = () => {
  const [handData, setHandData] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
  const [isPlayerModalOpen, setIsPlayerModalOpen] = useState(false);
  const [players, setPlayers] = useState([]);
  const [filteredHandData, setFilteredHandData] = useState([]);

  useEffect(() => {
    setTimeout(() => {
      setHandData(sampleData);
      setPlayers([...new Set(sampleData.flatMap(hand => hand.players))]); // Extract unique players
      setFilteredHandData(sampleData);
    }, 500);
  }, []);

  // useEffect(() => {
  //   fetchHandData();
  // }, []);

  // const fetchHandData = async () => {
  //   try {
  //     const functions = getFunctions();
  //     const getHandData = httpsCallable(functions, 'getHandData');
  //     const result = await getHandData();
  //     setHandData(result.data.handData);
  //     setSessions(result.data.entries.map(entry => ({
  //       handNumber: ,
  //       yourHand: xy,
  //       totalPot: yz,
  //       winner: 123,
  //       yourNet: 1234,
  //       players: []

  //     })));
  //   } catch (error) {
  //     console.error('Error fetching Hand data:', error);
  //   }
  // };

  const sortData = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });

    const sortedData = [...filteredHandData].sort((a, b) => {
      if (a[key] < b[key]) return direction === 'ascending' ? -1 : 1;
      if (a[key] > b[key]) return direction === 'ascending' ? 1 : -1;
      return 0;
    });

    setFilteredHandData(sortedData);
  };

  const openPlayerModal = () => {
    setIsPlayerModalOpen(true);
  };

  const closePlayerModal = () => {
    setIsPlayerModalOpen(false);
  };

  const filterByPlayer = (player) => {
    setFilteredHandData(player === 'All' ? handData : handData.filter(hand => hand.winner === player));
    closePlayerModal();
  };


  return (
    <div className="hand-insights-container">
      <h2>Online Session #2</h2>
      <h3>Hand Insights</h3>
      <table className="table-hand">
        <thead>
          <tr>
            <th onClick={openPlayerModal} style={{ cursor: 'pointer' }}>Hand Number</th>
            <th>Your Hand</th>
            <th onClick={() => sortData('totalPot')} style={{ cursor: 'pointer' }}>
              Total Pot ↕️
            </th>
            <th onClick={openPlayerModal} style={{ cursor: 'pointer' }}>Winner</th>
            <th onClick={() => sortData('yourNet')} style={{ cursor: 'pointer' }}>
              Your Net ↕️
            </th>
          </tr>
        </thead>
        <tbody>
          {filteredHandData.map((hand) => (
            <tr key={hand.handNumber}>
              <td>{hand.handNumber}</td>
              <td>{hand.yourHand}</td>
              <td>{hand.totalPot}</td>
              <td>{hand.winner}</td>
              <td className={hand.yourNet >= 0 ? 'positive' : 'negative'}>{hand.yourNet}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {isPlayerModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Select a Player</h2>
            <ul>
              <li className="player-item" onClick={() => filterByPlayer('All')}>All</li>
              {players.map((player, index) => (
                <li key={index} className="player-item" onClick={() => filterByPlayer(player)}>
                  {player}
                </li>
              ))}
            </ul>
            <button onClick={closePlayerModal} className="submit-button">Close</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default HandInsights;