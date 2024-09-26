import React, { useState, useEffect } from 'react';
import './HandInsights.css';
import { useNavigate } from 'react-router-dom';
import { useParams } from 'react-router-dom';
import { getFunctions, httpsCallable } from "firebase/functions";

const HandInsights = () => {
  const [handData, setHandData] = useState([]);
  const [filteredHandData, setFilteredHandData] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
  const [isPlayerModalOpen, setIsPlayerModalOpen] = useState(false);
  const [isHandModalOpen, setIsHandModalOpen] = useState(false);
  const [selectedHandActions, setSelectedHandActions] = useState([]); // Store the actions of the clicked hand
  const [players, setPlayers] = useState([]);
  const [sessionName, setSessionName] = useState('');
  const navigate = useNavigate();
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

      const mappedHandData = handDataFromApi.map(hand => ({
        handNumber: hand?.number || 0,
        yourHand: hand?.cards || 'N/A',
        totalPot: hand?.pot || 0,
        winner: hand?.winners || 'N/A',
        yourNet: hand?.yourNet || 0,
        players: hand?.players || [],
        actions: hand?.actions || [],  // Store the actions of each hand
      }));

      const sortedHandData = mappedHandData.sort((a, b) => a.handNumber - b.handNumber);
      setHandData(sortedHandData);
      setFilteredHandData(sortedHandData);
      setSessionName(sessionId);
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
      setSelectedHandActions(clickedHand.actions); // Set the clicked hand's actions
      setIsHandModalOpen(true);  // Open the modal
    }
  };

  const closeHandModal = () => {
    setIsHandModalOpen(false);
  };

  return (
    <div className="hand-insights-container">
      <h2>Online Session #{sessionName}</h2>
      <h3>Hand Insights</h3>

      <div className="hand-insights-table-wrapper">
        <table className="table-hand">
          <thead>
            <tr>
              <th onClick={() => sortData('handNumber')} style={{ cursor: 'pointer' }}>Hand Number</th>
              <th>Your Hand</th>
              <th onClick={() => sortData('totalPot')} style={{ cursor: 'pointer' }}>Total Pot ↕️</th>
              <th onClick={() => sortData('winner')} style={{ cursor: 'pointer' }}>Winner</th>
              <th onClick={() => sortData('yourNet')} style={{ cursor: 'pointer' }}>Your Net ↕️</th>
            </tr>
          </thead>
          <tbody>
            {filteredHandData.map((hand) => (
              <tr key={hand.handNumber} onClick={() => handleRowClick(hand.handNumber)} style={{ cursor: 'pointer' }}>
                <td>{hand.handNumber}</td>
                <td>{hand.yourHand}</td>
                <td>{hand.totalPot}</td>
                <td>{hand.winner.join(', ')}</td>
                <td className={hand.yourNet >= 0 ? 'positive' : 'negative'}>{hand.yourNet}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal for displaying hand actions */}
      {isHandModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Hand Actions</h2>
            {/* Display player stacks */}
            <p className="player-stacks">
              Events {selectedHandActions[0]?.players?.join(' | ')}
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
