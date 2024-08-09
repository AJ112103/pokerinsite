import React, { useState } from 'react';
import './Home.css';
import Papa from 'papaparse';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus } from '@fortawesome/free-solid-svg-icons';

function Home() {
  const [ledgerFile, setLedgerFile] = useState(null);
  const [logFile, setLogFile] = useState(null);
  const [ledgerFileName, setLedgerFileName] = useState('');
  const [logFileName, setLogFileName] = useState('');
  const [playersData, setPlayersData] = useState(null);
  const [isUploaded, setIsUploaded] = useState(false);
  const [selectedPlayers, setSelectedPlayers] = useState({});

  const togglePlayerSelection = (playerName) => {
    setSelectedPlayers(prev => ({
      ...prev,
      [playerName]: !prev[playerName]
    }));
  };

  const handleLedgerFileChange = (event) => {
    const file = event.target.files[0];
    setLedgerFile(file);
    setLedgerFileName(file.name);
    if (file) {
      ledgerParser(file);
    }
  };

  function truncateFilename(filename) {
    if (filename.length <= 35) return filename;
    return `${filename.substr(0, 15)}...${filename.substr(filename.length - 15)}`;
  }

  const handleLogFileChange = (event) => {
    const file = event.target.files[0];
    setLogFile(file);
    setLogFileName(file.name);
    if (file) {
      logParser(file);
    }
  };

  const handleUpload = () => {
    if (ledgerFile) {
      setIsUploaded(true);
    } else {
      alert('Please upload the ledger file.');
    }
  };

  const ledgerParser = (file) => {
    const reader = new FileReader();
    
    reader.onload = function(event) {
      const csvData = event.target.result;
      Papa.parse(csvData, {
        header: true,
        dynamicTyping: true,
        complete: function(results) {
          const parsedPlayersData = {};

          results.data.forEach(row => {
            const playerNickname = row.player_nickname;

            if (playerNickname) {
              parsedPlayersData[playerNickname] = {
                player_id: row.player_id,
                buy_in: row.buy_in,
                buy_out: row.buy_out,
                stack: row.stack,
                net: row.net
              };
            }
          });

          setPlayersData(parsedPlayersData);
        },
        error: function(error) {
          console.error('Error parsing CSV:', error);
        }
      });
    };

    reader.readAsText(file);
  };

  function logParser() {
    // Intentionally does nothing
  }

  return (
    <div className="container">
      <div className="card">
        {!isUploaded ? (
          <>
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
                <div className="plusButton">
                  <FontAwesomeIcon icon={faPlus} />
                </div>
                <span>{ledgerFileName ? truncateFilename(ledgerFileName) : 'Upload Ledger Here'}</span>
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
                <div className="plusButton">
                  <FontAwesomeIcon icon={faPlus} />
                </div>
                <span>{logFileName ? truncateFilename(logFileName) : 'Upload Log Here (Optional)'}</span>
              </label>
            </div>
            <button className="uploadButton" onClick={handleUpload}>
              Upload
            </button>
          </>
        ) : (
          <>
            <h2 className="title">Player Results</h2>
            <div className="playerResults">
              {Object.entries(playersData).map(([playerName, data]) => (
                <button
                  key={playerName}
                  className={`playerButton ${selectedPlayers[playerName] ? 'active' : ''}`}
                  onClick={() => togglePlayerSelection(playerName)}
                >
                  {playerName} ({data.net >= 0 ? `+${data.net}` : data.net})
                </button>
              ))}
            </div>
            <button className="uploadButton" onClick={() => setIsUploaded(false)}>
              Add Another Session
            </button>
          </>
        )}
      </div>
    </div>
  );
}
  

export default Home;
