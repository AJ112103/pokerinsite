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
  const [players, setPlayers] = useState([]);
  const [sessionName, setSessionName] = useState(''); // Initialize sessionName state
  const navigate = useNavigate();
  const { sessionId } = useParams();

  // Fetch the hand data from the Firebase function
  useEffect(() => {
    fetchHandData();
  }, []);

  const fetchHandData = async () => {
    try {
      const functions = getFunctions();
      const getHandsByGameId = httpsCallable(functions, 'getHandsByGameId');
      const result = await getHandsByGameId({ gameId: sessionId });
  
      console.log(result);  // Log the full result to check the structure
  
      // Safely access hands array from the result
      const handDataFromApi = result?.data?.hands || [];  // Ensure hands exist, otherwise set it to an empty array
  
      // If handData is empty, log a warning or provide default data
      if (handDataFromApi.length === 0) {
        console.warn('No hand data available for this session.');
      }
  
      // Map hand data if it exists
      const mappedHandData = handDataFromApi.map(hand => ({
        handNumber: hand?.number || 0, // Use hand.number directly
        yourHand: hand?.cards || 'N/A',
        totalPot: hand?.pot || 0,
        winner: hand?.winners || 'N/A',
        yourNet: hand?.yourNet || 0, // Directly accessing 'yourNet' as per the object structure
        players: hand?.players || [],
      }));
  
      // Sort the hands by handNumber (ascending order) as the default display
      const sortedHandData = mappedHandData.sort((a, b) => a.handNumber - b.handNumber);
  
      setHandData(sortedHandData);
      setFilteredHandData(sortedHandData);  // Set the sorted data for rendering
  
      // If session number is not available, show the sessionId instead as a fallback
      setSessionName(sessionId);  // Display sessionId if no other session details are available
  
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
      // Handle numeric sorting for the handNumber field
      if (key === 'handNumber') {
        return direction === 'ascending'
          ? a.handNumber - b.handNumber  // Ascending sort for numbers
          : b.handNumber - a.handNumber; // Descending sort for numbers
      } else {
        // Fallback for other fields (lexicographical or custom sorting logic)
        if (a[key] < b[key]) return direction === 'ascending' ? -1 : 1;
        if (a[key] > b[key]) return direction === 'ascending' ? 1 : -1;
        return 0;
      }
    });

    setFilteredHandData(sortedData);
  };

  const handleRowClick = (handNumber) => {
    navigate(`/hand-insights/${sessionId}/${handNumber}`); // Navigate to specific hand insights
  };

  // Open and close player filter modal
  const openPlayerModal = () => {
    setIsPlayerModalOpen(true);
  };

  const closePlayerModal = () => {
    setIsPlayerModalOpen(false);
  };

  // Filter the hand data by the selected player
  const filterByPlayer = (player) => {
    setFilteredHandData(player === 'All' ? handData : handData.filter(hand => hand.winner.includes(player)));
    closePlayerModal();
  };

  return (
    <div className="hand-insights-container">
      <h2>Online Session #{sessionName}</h2>  {/* Use sessionName instead of sessionId */}
      <h3>Hand Insights</h3>
      
      {/* Scrollable wrapper for the table */}
      <div className="hand-insights-table-wrapper">
        <table className="table-hand">
          <thead>
            <tr>
              <th onClick={() => sortData('handNumber')} style={{ cursor: 'pointer' }}>Hand Number</th>
              <th>Your Hand</th>
              <th onClick={() => sortData('totalPot')} style={{ cursor: 'pointer' }}>Total Pot ↕️</th>
              <th onClick={openPlayerModal} style={{ cursor: 'pointer' }}>Winner</th>
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
