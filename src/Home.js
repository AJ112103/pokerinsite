import React, { useState, useEffect } from 'react';
import './Home.css';
import Papa from 'papaparse';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { getFunctions, httpsCallable } from 'firebase/functions';
import RouletteLoader from './RouletteLoader';
import SubscriptionPopup from './SubscriptionPopup';
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { faPlus } from '@fortawesome/free-solid-svg-icons';

function Home() {
  const [ledgerFile, setLedgerFile] = useState(null);
  const [logFile, setLogFile] = useState(null);
  const [ledgerFileName, setLedgerFileName] = useState('');
  const [logFileName, setLogFileName] = useState('');
  const [playersData, setPlayersData] = useState(null);
  const [isUploaded, setIsUploaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPlayers, setSelectedPlayers] = useState({});
  const [showSubscriptionPopup, setShowSubscriptionPopup] = useState(false);
  const [uploadsLeft, setUploadsLeft] = useState(0);
  const [includeCents, setIncludeCents] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const togglePlayerSelection = (playerName) => {
    setSelectedPlayers(prev => ({
      ...prev,
      [playerName]: !prev[playerName]
    }));
  };

  const truncateName = (name) => {
    const maxLength = 7;
    if (name.length > maxLength) {
      return `${name.substring(0, maxLength)}...`;
    }
    return name;
  };

  const handleLedgerFileChange = (event) => {
    const file = event.target.files[0];
    setLedgerFile(file);
    setLedgerFileName(file.name);
  };

  function truncateFilename(filename) {
    if (filename.length <= 35) return filename;
    return `${filename.substr(0, 15)}...${filename.substr(filename.length - 15)}`;
  }

  const handleLogFileChange = (event) => {
    const file = event.target.files[0];
    setLogFile(file);
    setLogFileName(file.name);
  };

  
  const handleUpload = () => {
    if (ledgerFile) {
        setIsLoading(true);
        // Adjust the callback to receive parsedPlayersData
        ledgerParser(ledgerFile, (parsedPlayersData) => {
            console.log("Parsed Players Data:", parsedPlayersData);

            if (!parsedPlayersData || Object.keys(parsedPlayersData).length === 0) {
                resetData();
                console.log("Invalid format for ledger file");
                alert("Invalid format for ledger file");
            } else {
                const functions = getFunctions();
                const checkUploadPermission = httpsCallable(functions, 'checkUploadPermission');

                checkUploadPermission().then((result) => {
                    if (result.data.success) {
                        if (result.data.free) {
                            setUploadsLeft(result.data.uploadsLeft - 1);
                            setShowSubscriptionPopup(true);
                        }
                        setIsLoading(false);
                        setIsUploaded(true);
                    } else {
                        setShowSubscriptionPopup(true);
                        setIsLoading(false);
                        setLedgerFile(null);
                        setLogFile(null);
                        setLedgerFileName('');
                        setLogFileName('');
                        setPlayersData(null);
                    }
                }).catch((error) => {
                    console.error('Error checking upload permission:', error);
                    setIsLoading(false);
                    alert('Error processing upload. Please try again.');
                });
            }
        });
    } else {
        alert('Please upload the ledger file.');
    }
};
  
  const ledgerParser = (file, onParseComplete) => {
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
                      if (parsedPlayersData.hasOwnProperty(playerNickname)) {
                          parsedPlayersData[playerNickname].net += row.net;
                      } else {
                          parsedPlayersData[playerNickname] = {
                              player_id: row.player_id,
                              net: row.net
                          };
                      }
                  }
              });
                console.log("Parsed Data:", parsedPlayersData);
                setPlayersData(parsedPlayersData);
                if (onParseComplete) {
                    onParseComplete(parsedPlayersData); // Pass the parsed data to the callback
                }
            },
            error: function(error) {
                console.error('Error parsing CSV:', error);
            }
        });
    };

    reader.readAsText(file);
};

  function resetData() {
    setLedgerFile(null);
    setLogFile(null);
    setLedgerFileName('');
    setLogFileName('');
    setPlayersData(null);
    setIsUploaded(false);
    setIsLoading(false);
    setSelectedPlayers({});
    setShowSubscriptionPopup(false);
    setIncludeCents(false);
    setIsSuccess(false);
  }

  function addPlayerData() {
    setIsLoading(true);
    let totalNet = 0;
    Object.entries(selectedPlayers).forEach(([playerName, isSelected]) => {
      if (isSelected) {
        console.log(playersData[playerName]);
        totalNet += playersData[playerName].net;
      }
    });
    if (includeCents)
      {
        totalNet = totalNet/100;
      }
    const currentDate = formatDate();
    const functions = getFunctions();
      const addBankrollEntryAndUpdateScore = httpsCallable(functions, 'addBankrollEntryAndUpdateScore');
      addBankrollEntryAndUpdateScore({
        date: currentDate,
        score: totalNet
      }).then((result) => {
        if (logFile) {
          logParser();
        }
        else {
          setIsLoading(false);
          setIsSuccess(true);
          setTimeout(() => resetData(), 1000); 
        }
      }).catch((error) => {
        console.error('Error updating bankroll:', error);
      });
  }

  const formatDate = (date = new Date()) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    const targetDate = new Date(date); // Use the current date if no date is provided
    const formattedDate = targetDate.toLocaleDateString('en-US', options);
    
    const day = targetDate.getDate();
    const month = targetDate.toLocaleString('en-US', { month: 'long' });
    const year = targetDate.getFullYear();

    const daySuffix = (day) => {
      if (day > 3 && day < 21) return 'th';
      switch (day % 10) {
        case 1: return 'st';
        case 2: return 'nd';
        case 3: return 'rd';
        default: return 'th';
      }
    };

    return `${month} ${day}${daySuffix(day)}, ${year}`;
};
 
  function logParser() {  
    if (logFile) {
        const storage = getStorage();
        const storageRef = ref(storage, 'uploads/' + logFile.name);
        console.log(selectedPlayers.net);
        console.log(playersData);

        uploadBytes(storageRef, logFile).then((snapshot) => {

            getDownloadURL(snapshot.ref).then((downloadURL) => {
                console.log('File available at', downloadURL);
                

                const functions = getFunctions();
                const storeHardcodedData = httpsCallable(functions, 'storeHardcodedData');

                storeHardcodedData().then((result) => {
                    if (result.data) {
                      console.log("YAY");
                    } else {
                      console.log("BOO");
                    }
                }).catch((error) => {
                    console.error('Error checking upload permission:', error);
                    setIsLoading(false);
                    alert('Error processing upload. Please try again.');
                });
            });
        }).catch((error) => {
            console.error('Upload failed', error);
        });
    } else {
        setIsUploaded(false);
    }
  }
    const closePopup = () => {
      setShowSubscriptionPopup(false);
    };


  if (isLoading)
    {
      return (
        <div className="container">
          <div className="loading-card">
            <RouletteLoader />
          </div>
        </div>
      )
    }

    if (isSuccess)
      {
        return (
          <div className="container">
            <div className="loading-card">
              <h3>Success!</h3>
            </div>
          </div>
        )
      }

  return (
    <div className="container">
      {showSubscriptionPopup && <SubscriptionPopup uploadsLeft={uploadsLeft} onClose={closePopup} />}
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
            <h2 className="title">Select Your Accounts</h2>
            <div className="playerResults">
              {Object.entries(playersData).map(([playerName, data]) => {
                const displayNet = includeCents ? (data.net / 100).toFixed(2) : data.net;
                const netClass = data.net >= 0 ? 'netPositive' : 'netNegative';

                return (
                  <button
                    key={playerName}
                    className={`playerButton ${selectedPlayers[playerName] ? 'active' : ''}`}
                    onClick={() => togglePlayerSelection(playerName)}
                  >
                    {truncateName(playerName)}
                    <span className={netClass}> ({displayNet >= 0 ? `+${displayNet}` : displayNet}) </span>
                  </button>
                );
              })}
            </div>
            <div className="toggleContainer">
              <label className="toggleLabel">
                Include cent values
                <input
                  type="checkbox"
                  checked={includeCents}
                  onChange={() => setIncludeCents(!includeCents)}
                  className="toggleCheckbox"
                />
              </label>
            </div>
            <button className="uploadButton" onClick={() => addPlayerData()}>
              Confirm
            </button>
          </>
        )}
      </div>
    </div>
  );
}
  

export default Home;
