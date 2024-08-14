import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser } from '@fortawesome/free-solid-svg-icons';
import './user.css';

function User() {

    // const [subscriptionTier, setSubscriptionTier] = useState('');
    // const [email, setEmail] = useState('');
    // const [uploadsLeft, setUploadsLeft] = useState('');

    // useEffect(() => {
    //   // Fetch email from backend
    //   fetch('/api/getUserEmail')  // Replace with your actual API endpoint
    //     .then(response => response.json())
    //     .then(data => setEmail(data.email))
    //     .catch(error => console.error('Error fetching email:', error));


    //     fetch('/api/getUserSubscriptionTier')  // Replace with your actual API endpoint
    //         .then(response => response.json())
    //         .then(data => setSubscriptionTier(data.subscriptionTier))
    //         .catch(error => console.error('Error fetching subscription tier:', error));
    

    //     fetch('/api/getUserUploadLeft')  // Replace with your actual API endpoint
    //         .then(response => response.json())
    //         .then(data => setUploadsLeft(data.uploadsLeft))
    //         .catch(error => console.error('Error fetching uploads left:', error));
    //     }, []);

    // const handleCancelSubscription = () => {
    //     // Logic for canceling the subscription
    //     console.log("Subscription canceled");
    // };

    const handleLogout = () => {
        // Logic for logging out
        console.log("User logged out");
    };

  return (
    <div className="user-container">
      <FontAwesomeIcon icon={faUser} className="user-icon2" />
      {/* <p className="container2 email">{email}</p> */}<p className="container2 email">player-email@goes.here</p>
      {/* <p className="container2 subscription-tier">{subscriptionTier}</p> */}<p className="container2 subscription-tier">Subscription Tier</p>
      {/* <p className="container2 uploads-left">{uploadsLeft}</p> */}<p className="container2 uploads-left">Uploads Left</p>
      {/* {subscriptionTier !== 'free' && (
        <button className="cancel-subscription-button" onClick={handleCancelSubscription}>
          Cancel Subscription
        </button>
      )} */}
      <button className="cancel-subscription-button">Cancel Subscription</button>
      <button className="logout-button" onClick={handleLogout}>
        Log Out
      </button>
    </div>
  );
}

export default User;