import React, { useState } from 'react';
import './Home.css'; // Import the CSS file

function Home() {
  const [ledgerFile, setLedgerFile] = useState(null);
  const [logFile, setLogFile] = useState(null);

  const handleLedgerFileChange = (event) => {
    setLedgerFile(event.target.files[0]);
  };

  const handleLogFileChange = (event) => {
    setLogFile(event.target.files[0]);
  };

  const handleUpload = () => {
    if (ledgerFile && logFile) {
      console.log('Ledger File:', ledgerFile);
      console.log('Log File:', logFile);
      // Handle the file upload process here
    } else {
      alert('Please upload both files.');
    }
  };

  return (
    <div className="container">
      <div className="card">
        <h2 className="title">Add New PokerNow Session</h2>
        <div className="uploadContainer">
          <input
            type="file"
            accept=".csv"
            className="fileInput"
            onChange={handleLedgerFileChange}
            id="ledgerFile"
          />
          <label className="label" htmlFor="ledgerFile">
            <div className="plusButton">+</div>
            <span>Upload Ledger Here</span>
          </label>
        </div>
        <div className="uploadContainer">
          <input
            type="file"
            accept=".csv"
            className="fileInput"
            onChange={handleLogFileChange}
            id="logFile"
          />
          <label className="label" htmlFor="logFile">
            <div className="plusButton">+</div>
            <span>Upload Log Here</span>
          </label>
        </div>
        <button className="uploadButton" onClick={handleUpload}>
          Upload
        </button>
      </div>
    </div>
  );
}

export default Home;
