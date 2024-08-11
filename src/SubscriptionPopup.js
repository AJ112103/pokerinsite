// import React from 'react';
// import { getFunctions, httpsCallable } from 'firebase/functions';
// import './SubscriptionPopup.css';

// function SubscriptionPopup({ onClose }) {
//   const handleSubscribe = async () => {
//     const functions = getFunctions();
//     const createStripeSession = httpsCallable(functions, 'on_request_example');

//     createStripeSession().then(({ data }) => {
//         console.log(data);
//          window.location.href = `${data.sessionId}`;
//     }).catch(error => {
//       console.error('Error creating Stripe session:', error);
//       alert('There was an issue initiating your payment. Please try again.');
//     });
//   };

//   return (
//     <div className="popup-overlay">
//       <div className="popup-content">
//         <h2>Support Us!</h2>
//         <p>This is the best way to support us. We offer unlimited uploads and new features coming soon, all for just $5 a month.</p>
//         <button className="subscribe-button" onClick={handleSubscribe}>
//           Subscribe Now
//         </button>
//         <button className="maybe-later" onClick={onClose}>
//           Maybe Later
//         </button>
//       </div>
//     </div>
//   );
// }

// export default SubscriptionPopup;
