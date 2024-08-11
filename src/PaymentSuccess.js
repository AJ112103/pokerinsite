import React from 'react';
import { useNavigate } from 'react-router-dom';
import './PaymentSuccess.css'; // Assuming you will create a CSS file for styling

function PaymentSuccess() {
    const navigate = useNavigate();

    const goToHome = () => {
        navigate('/add-session');
    };

    return (
        <div className="success-container">
            <svg className="checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
                <circle className="checkmark-circle" cx="26" cy="26" r="25" fill="none"/>
                <path className="checkmark-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
            </svg>
            <div className="message">Payment Successful</div>
            <div className="home-link" onClick={goToHome}>Return to Home</div>
        </div>
    );
}

export default PaymentSuccess;
