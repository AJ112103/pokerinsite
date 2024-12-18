import React, { useState, useEffect } from 'react';
import './HandInsights.css';
import { useParams } from 'react-router-dom';
import { getFunctions, httpsCallable } from "firebase/functions";

const HandInsights = () => {
  const [handData, setHandData] = useState([]);
  const [filteredHandData, setFilteredHandData] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
  const [isPlayerModalOpen, setIsPlayerModalOpen] = useState(false);
  const [isHandModalOpen, setIsHandModalOpen] = useState(false);
  const [selectedHandActions, setSelectedHandActions] = useState([]);
  const [sessionName, setSessionName] = useState('');
  const [winners, setWinners] = useState([]);
  const { sessionId } = useParams();

  useEffect(() => {
    fetchHandData();
  }, []);

  const fetchHandData = async () => {
    try {
      const functions = getFunctions();
      const getHandsByGameId = httpsCallable(functions, 'getHandsByGameId');
      const result = await getHandsByGameId({ gameId: sessionId });
      console.log(result);
  
      const handDataFromApi = result?.data?.hands || [];
      if (handDataFromApi.length === 0) {
        console.warn('No hand data available for this session.');
      }
  
      const allWinners = [...new Set(handDataFromApi.flatMap(hand => hand?.winners || []))];
  
      const getCardHtml = (cards) => {
        return cards
          .map((card) => {
            let value = card.slice(0, -1);
            const suit = card.slice(-1);
            if (value === '0') {
              value = '10';
            }
            const color = suit === '♥' || suit === '♦' ? 'red' : 'black';
            return `<span style="color: black; font-size: 16px;">
                      ${value}<span style="color: ${color}; font-size: 20px">${suit}</span>
                    </span>`;
          })
          .join('<span style="margin-left: -40px;"></span>');
      };
      

      const mappedHandData = handDataFromApi.map(hand => ({
        handNumber: hand?.number || 0,
        yourHand: Array.isArray(hand?.cards) ? getCardHtml(hand.cards) : 'N/A',
        totalPot: hand?.pot || 0,
        winner: Array.isArray(hand?.winners) ? hand?.winners : ['N/A'],
        yourNet: hand?.yourNet || 0,
        players: hand?.players || [],
        actions: hand?.actions || [],
      }));
      
    
      const sortedHandData = mappedHandData.sort((a, b) => a.handNumber - b.handNumber);
      setHandData(sortedHandData);
      setFilteredHandData(sortedHandData);
      setWinners(allWinners);
      setSessionName(result.data.sessionName);
    } catch (error) {
      console.error('Error fetching Hand data:', error);
    }
  };
  

  const sortData = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });

    const sortedData = [...filteredHandData].sort((a, b) => {
      if (key === 'handNumber') {
        return direction === 'ascending' ? a.handNumber - b.handNumber : b.handNumber - a.handNumber;
      } else {
        if (a[key] < b[key]) return direction === 'ascending' ? -1 : 1;
        if (a[key] > b[key]) return direction === 'ascending' ? 1 : -1;
        return 0;
      }
    });

    setFilteredHandData(sortedData);
  };

  const handleRowClick = (handNumber) => {
    const clickedHand = handData.find(hand => hand.handNumber === handNumber);
    if (clickedHand) {
      setSelectedHandActions(clickedHand.actions);
      setIsHandModalOpen(true);
    }
  };

  const closeHandModal = () => {
    setIsHandModalOpen(false);
  };

  const handleOutsideClick = (event) => {
    if (event.target.classList.contains('modal-overlay')) {
      closeHandModal();
    }
  };

  const openPlayerModal = () => {
    setIsPlayerModalOpen(true);
  };

  const closePlayerModal = () => {
    setIsPlayerModalOpen(false);
  };

  const filterByWinner = (winner) => {
    setFilteredHandData(winner === 'All' ? handData : handData.filter(hand => hand.winner.includes(winner)));
    closePlayerModal();
  };

  return (
    <div className="hand-insights-container">
      <h2>{sessionName}</h2>
      <h3>Hand Insights</h3>

      <div className="hand-insights-table-wrapper">
        <table className="table-hand">
          <thead>
            <tr>
              <th onClick={() => sortData('handNumber')} style={{ cursor: 'pointer' }}>Hand Number</th>
              <th>Your Hand</th>
              <th onClick={() => sortData('totalPot')} style={{ cursor: 'pointer' }}>Total Pot ↕️</th>
              <th onClick={openPlayerModal} style={{ cursor: 'pointer' }}>Winner</th> {/* Open winner modal */}
              <th onClick={() => sortData('yourNet')} style={{ cursor: 'pointer' }}>Your Net ↕️</th>
            </tr>
          </thead>
          <tbody>
            {filteredHandData.map((hand) => (
              <tr key={hand.handNumber} onClick={() => handleRowClick(hand.handNumber)} style={{ cursor: 'pointer' }}>
                <td>{hand.handNumber}</td>
                <td dangerouslySetInnerHTML={{ __html: hand.yourHand }}></td>
                <td>{hand.totalPot}</td>
                <td>{hand.winner.join(', ')}</td>
                <td style={{ color: hand.yourNet >= 0 ? 'green' : 'red' }} className={hand.yourNet >= 0 ? 'positive' : 'negative'}>{hand.yourNet}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal for selecting winners */}
      {isPlayerModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Select a Winner</h2>

            {/* All button centered */}
            <div className="all-button" onClick={() => filterByWinner('All')}>All</div>

            {/* Winner grid */}
            <div className="winner-grid">
              {winners.map((winner, index) => (
                <div key={index} className="winner-item" onClick={() => filterByWinner(winner)}>
                  {winner}
                </div>
              ))}
            </div>
            <button onClick={closePlayerModal} className="submit-button">Close</button>
          </div>
        </div>
      )}

      {/* Modal for displaying hand actions */}
      {isHandModalOpen && (
        <div className="modal-overlay" onClick={handleOutsideClick}>
          <div className="modal-content">
            <h2>Hand Actions</h2>
            <p className="player-stacks">
              Player Stacks: {selectedHandActions[0]?.players?.join(' | ')}
            </p>
            <ol className="action-list">
              {selectedHandActions.map((action, index) => (
                <li key={index} className="action-item">{action}</li>
              ))}
            </ol>
            <button onClick={closeHandModal} className="submit-button">Close</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default HandInsights;
