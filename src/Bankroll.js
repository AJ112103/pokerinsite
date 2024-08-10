import React, { useState, useEffect } from 'react';
import './Bankroll.css';
import { parse } from 'date-fns';

function Bankroll() {
  const [sessions, setSessions] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newSession, setNewSession] = useState({
    session: '',
    date: '',
    score: '',
  });
  const [sessionType, setSessionType] = useState('online'); // State for session type
  const [sessionNumber, setSessionNumber] = useState(''); // State for session number
  const [customSession, setCustomSession] = useState(''); // State for custom session
  const [selectedDate, setSelectedDate] = useState('');
  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: 'ascending',
  });

  useEffect(() => {
    const sampleData = [
      { session: 'Online Session #1', date: 'July 24th, 2024', score: -200 },
      { session: 'Online Session #2', date: 'August 3rd, 2024', score: 573 },
    ];
    setSessions(sampleData);
  }, []);

  const formatDate = (date) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    const formattedDate = new Date(date).toLocaleDateString('en-US', options);
    
    const day = new Date(date).getDate();
    const daySuffix = (day) => {
      if (day > 3 && day < 21) return 'th';
      switch (day % 10) {
        case 1: return 'st';
        case 2: return 'nd';
        case 3: return 'rd';
        default: return 'th';
      }
    };
    
    return formattedDate.replace(day, `${day}${daySuffix(day)}`);
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    
    let sessionName = '';
    if (sessionType === 'custom') {
      sessionName = customSession;
    } else {
      sessionName = `${sessionType === 'online' ? 'Online' : 'Offline'} Session #${sessionNumber}`;
    }
    
    const sessionData = {
      ...newSession,
      session: sessionName,
      date: formatDate(selectedDate), 
      score: parseFloat(newSession.score),
    };

    setSessions([...sessions, sessionData]);

    fetch('/api/sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sessionData),
    })
      .then((response) => response.json())
      .then((data) => console.log('Data sent to the backend:', data))
      .catch((error) => console.error('Error sending data to the backend:', error));

    setIsModalOpen(false);
    setNewSession({ session: '', date: '', score: '' });
    setSelectedDate('');
    setSessionType('online');
    setSessionNumber('');
    setCustomSession('');
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    if (name === 'date') {
      setSelectedDate(value);
    } else {
      setNewSession({ ...newSession, [name]: value });
    }
  };

  const handleSessionTypeChange = (e) => {
    setSessionType(e.target.value);
    setSessionNumber('');
    setCustomSession('');
  };

  const sortSessions = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
  
    const sortedSessions = [...sessions].sort((a, b) => {
      if (key === 'date') {
        const dateA = parse(a.date, 'MMMM do, yyyy', new Date());
        const dateB = parse(b.date, 'MMMM do, yyyy', new Date());
        return direction === 'ascending' ? dateA - dateB : dateB - dateA;
      } else if (key === 'score') {
        return direction === 'ascending' ? a.score - b.score : b.score - a.score;
      }
      return 0;
    });
  
    setSortConfig({ key, direction });
    setSessions(sortedSessions);
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return "";
    return sortConfig.direction === 'ascending' ? '▼' : '▲';
  };

  return (
    <div className="bankroll-container">
      <h2>Your Total Bankroll: $4927</h2>
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Session</th>
              <th onClick={() => sortSessions('date')}>
                Date {getSortIcon('date')}
              </th>
              <th onClick={() => sortSessions('score')}>
                Net Score {getSortIcon('score')}
              </th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((session, index) => (
              <tr key={index}>
                <td>{session.session}</td>
                <td>{session.date}</td>
                <td style={{ color: session.score >= 0 ? 'green' : 'red' }}>
                  {session.score >= 0 ? `+$${session.score}` : `-$${Math.abs(session.score)}`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="button-group">
        <button>View Graph</button>
        <button onClick={() => setIsModalOpen(true)}>Add Entry</button>
      </div>

      {isModalOpen && (
        <div className="modal">
          <div className="modal-content">
            <span className="close-button" onClick={() => setIsModalOpen(false)}>&times;</span>
            <h3>Add New Session</h3>
            <form onSubmit={handleFormSubmit}>
              <label>
                Session Type:
                <select value={sessionType} onChange={handleSessionTypeChange} required>
                  <option value="online">Online Session #</option>
                  <option value="offline">Offline Session #</option>
                  <option value="custom">Custom Entry</option>
                </select>
              </label>
              {sessionType !== 'custom' && (
                <label>
                  Session Number:
                  <input
                    type="number"
                    name="sessionNumber"
                    value={sessionNumber}
                    onChange={(e) => setSessionNumber(e.target.value)}
                    required
                  />
                </label>
              )}
              {sessionType === 'custom' && (
                <label>
                  Custom Session:
                  <input
                    type="text"
                    name="customSession"
                    value={customSession}
                    onChange={(e) => setCustomSession(e.target.value)}
                    required
                  />
                </label>
              )}
              <label>
                Date:
                <input
                  type="date"
                  name="date"
                  value={selectedDate} 
                  onChange={handleInputChange}
                  required
                />
              </label>
              <label>
                Net Score:
                <input
                  type="number"
                  name="score"
                  value={newSession.score}
                  onChange={handleInputChange}
                  required
                />
              </label>
              <button type="submit">Add Session</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Bankroll;
