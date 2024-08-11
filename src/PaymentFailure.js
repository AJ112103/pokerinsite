import React from 'react';
import { useNavigate } from 'react-router-dom';
import './PaymentFailure.css'; // Assuming you will create a CSS file for styling

function PaymentFailure() {
    const navigate = useNavigate();

    const goToHome = () => {
        navigate('/add-session');
    };

    return (
        <div className="failure-container">
            <svg className="crossmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
                <circle className="crossmark-circle" cx="26" cy="26" r="25" fill="none"/>
                <path className="crossmark-cross" fill="none" d="M16 16 L36 36 M36 16 L16 36"/>
            </svg>
            <div className="message">Payment Failed, Try Again</div>
            <div className="home-link" onClick={goToHome}>Return to Home</div>
        </div>
    );
}

export default PaymentFailure;
