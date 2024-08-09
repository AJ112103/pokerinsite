import React, { useState, useEffect } from 'react';
import './Bankroll.css';

function Bankroll() {
  // State to store the session data fetched from the backend
  const [sessions, setSessions] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newSession, setNewSession] = useState({
    session: '',
    date: '',
    score: '',
  });

  // Simulate fetching data from the backend with sample data
  useEffect(() => {
    const sampleData = [
      { session: 'Online Session #1', date: 'July 24th, 2024', score: -200 },
      { session: 'Online Session #2', date: 'August 3rd, 2024', score: 573 },
      { session: 'Online Session #3', date: 'August 10th, 2024', score: 150 },
      { session: 'Online Session #4', date: 'August 12th, 2024', score: -50 },
    ];
    setSessions(sampleData);
  }, []);

  // Function to handle the form submission
  const handleFormSubmit = (e) => {
    e.preventDefault();
    const sessionData = {
      ...newSession,
      score: parseFloat(newSession.score), // Ensure the score is a number
    };

    // Add the new session to the state
    setSessions([...sessions, sessionData]);

    // Send the data to the backend (replace the URL with your actual backend endpoint)
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

    // Close the modal
    setIsModalOpen(false);
    // Reset form fields
    setNewSession({ session: '', date: '', score: '' });
  };

  // Function to handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewSession({ ...newSession, [name]: value });
  };

  return (
    <div className="bankroll-container">
      <h2>Your Total Bankroll: $4927</h2> {/* You can adjust the total bankroll dynamically if needed */}
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Session</th>
              <th>Date</th>
              <th>Net Score</th>
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

      {/* Modal for adding a new entry */}
      {isModalOpen && (
        <div className="modal">
          <div className="modal-content">
            <h3>Add New Session</h3>
            <form onSubmit={handleFormSubmit}>
              <label>
                Session:
                <input
                  type="text"
                  name="session"
                  value={newSession.session}
                  onChange={handleInputChange}
                  required
                />
              </label>
              <label>
                Date:
                <input
                  type="date"
                  name="date"
                  value={newSession.date}
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
              <button type="button" onClick={() => setIsModalOpen(false)}>
                Cancel
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Bankroll;
