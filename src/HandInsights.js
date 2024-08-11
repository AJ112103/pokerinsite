import React, { useState, useEffect } from 'react';

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
  const [isWinnerModalOpen, setIsWinnerModalOpen] = useState(false);
  const [selectedWinner, setSelectedWinner] = useState(null);
  const [winnerHandsData, setWinnerHandsData] = useState([]);

  useEffect(() => {
    // Simulating an API call
    setTimeout(() => {
      setHandData(sampleData);
    }, 500);
  }, []);

  const sortData = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });

    const sortedData = [...handData].sort((a, b) => {
      if (a[key] < b[key]) return direction === 'ascending' ? -1 : 1;
      if (a[key] > b[key]) return direction === 'ascending' ? 1 : -1;
      return 0;
    });

    setHandData(sortedData);
  };

  const openWinnerModal = (winner) => {
    setSelectedWinner(winner);
    setWinnerHandsData(handData.filter(hand => hand.winner === winner));
    setIsWinnerModalOpen(true);
  };

  const closeWinnerModal = () => {
    setIsWinnerModalOpen(false);
    setSelectedWinner(null);
    setWinnerHandsData([]);
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px' }}>Online Session #2</h2>
      <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '8px' }}>Hand Insights</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #ddd' }}>Hand Number</th>
            <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #ddd' }}>Your Hand</th>
            <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #ddd' }}>
              Total Pot
              <button onClick={() => sortData('totalPot')} style={{ marginLeft: '8px', background: 'none', border: 'none', cursor: 'pointer' }}>
                ↕️
              </button>
            </th>
            <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #ddd' }}>Winner</th>
            <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #ddd' }}>
              Your Net
              <button onClick={() => sortData('yourNet')} style={{ marginLeft: '8px', background: 'none', border: 'none', cursor: 'pointer' }}>
                ↕️
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          {handData.map((hand) => (
            <tr key={hand.handNumber}>
              <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>{hand.handNumber}</td>
              <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>{hand.yourHand}</td>
              <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>{hand.totalPot}</td>
              <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>
                <button onClick={() => openWinnerModal(hand.winner)} style={{ background: 'none', border: 'none', color: 'blue', textDecoration: 'underline', cursor: 'pointer' }}>
                  {hand.winner}
                </button>
              </td>
              <td style={{ padding: '8px', borderBottom: '1px solid #ddd', color: hand.yourNet >= 0 ? 'green' : 'red' }}>
                {hand.yourNet}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {isWinnerModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '5px',
            maxWidth: '80%',
            maxHeight: '80%',
            overflow: 'auto'
          }}>
            <h2 style={{ marginBottom: '16px' }}>{selectedWinner}'s Winning Hands</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #ddd' }}>Hand Number</th>
                  <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #ddd' }}>Total Pot</th>
                </tr>
              </thead>
              <tbody>
                {winnerHandsData.map((hand) => (
                  <tr key={hand.handNumber}>
                    <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>{hand.handNumber}</td>
                    <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>{hand.totalPot}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button onClick={closeWinnerModal} style={{
              marginTop: '16px',
              padding: '8px 16px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default HandInsights; 