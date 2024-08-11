import React, { useState, useEffect } from 'react';
import './Bankroll.css';
import { parse } from 'date-fns';
import { initializeApp } from "firebase/app";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getFunctions, httpsCallable } from "firebase/functions"; 


function Bankroll() {
  const [sessions, setSessions] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeModal, setActiveModal] = useState(null);
  const [newSession, setNewSession] = useState({
    session: '',
    date: '',
    score: '',
  });
  const [sessionType, setSessionType] = useState('online');
  const [sessionNumber, setSessionNumber] = useState('');
  const [customSession, setCustomSession] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: 'ascending',
  });
  const [netScore, setNetScore] = useState(0);
  const [initialBankroll, setInitialBankroll] = useState('');

  useEffect(() => {
    fetchBankrollData();
  }, []);

  const fetchBankrollData = async () => {
    try {
      const functions = getFunctions();
      const getBankrollData = httpsCallable(functions, 'getBankrollData');
      const result = await getBankrollData();
      setNetScore(result.data.netScore);
      setSessions(result.data.entries.map(entry => ({
        id: entry.id,
        session: entry.name,
        date: entry.date,
        score: entry.score
      })));
    } catch (error) {
      console.error('Error fetching bankroll data:', error);
    }
  };

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

    async function saveBankroll(sessionData) {
      const functions = getFunctions();
      const addBankrollEntryAndUpdateScore = httpsCallable(functions, 'addBankrollEntryAndUpdateScore');
      addBankrollEntryAndUpdateScore({
        sessionName: sessionData.session,
        date: sessionData.date,
        score: sessionData.score
      }).then((result) => {
        console.log('Updated Net Score:', result.data.netScore);
        setNetScore(result.data.netScore);
      }).catch((error) => {
        console.error('Error updating bankroll:', error);
      });
    }

    saveBankroll(sessionData);

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

  const handleInitializeBankroll = (e) => {
    e.preventDefault();
    setNetScore(parseFloat(initialBankroll));
    setInitialBankroll('');
    setActiveModal(null);
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
      <h2>Your Total Bankroll: ${netScore}</h2>
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
            {sessions.map((session) => (
              <tr key={session.id}>
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
        <button onClick={() => setActiveModal('initializeBankroll')}>Initialize Bankroll</button>
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
                  onChange={(e) => setSelectedDate(e.target.value)}
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

      {activeModal === 'initializeBankroll' && (
        <div className="modal">
          <div className="modal-content">
            <span className="close-button" onClick={() => setActiveModal(null)}>&times;</span>
            <h3>Initialize Bankroll</h3>
            <form onSubmit={handleInitializeBankroll}>
              <label>
                Initial Bankroll Amount:
                <input
                  type="number"
                  name="initialBankroll"
                  value={initialBankroll}
                  onChange={handleInputChange}
                  required
                />
              </label>
              <button type="submit">Initialize</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Bankroll;
