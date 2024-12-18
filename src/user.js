import React, { useState, useEffect } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import './user.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser } from '@fortawesome/free-solid-svg-icons';
import { useNavigate } from 'react-router-dom';
import { getAuth, signOut } from "firebase/auth";
import RouletteLoader from './RouletteLoader';

function User() {
    const navigate = useNavigate();
    const [userData, setUserData] = useState({
        email: '',
        name: '',
        stripeCustomerId: '',
        subscriptionTier: '',
        uploads: 0
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchUserData = async () => {
            setIsLoading(true);
            const functions = getFunctions();
            const getUserData = httpsCallable(functions, 'getUserData');

            try {
                const result = await getUserData();
                setUserData(result.data);
                setIsLoading(false);
            } catch (error) {
                console.error('Failed to fetch user data:', error);
                setError('Failed to fetch user data');
                setIsLoading(false);
            }
        };

        fetchUserData();
    }, []);

    const handleLogout = async () => {
        const auth = getAuth();
        signOut(auth).then(() => {
            console.log("User logged out successfully");
            navigate('/'); 
        }).catch((error) => {
            console.error("Logout failed", error);
        });
    };

    const handleSubscribe = async () => {
        const functions = getFunctions();
        const createStripeSession = httpsCallable(functions, 'createStripeSession');
        setIsLoading(true);

        createStripeSession().then(({ data }) => {
            window.location.href = data.sessionId;
        }).catch(error => {
            console.error('Error creating Stripe session:', error);
            alert('There was an issue initiating your payment. Please try again.');
        });
    };

    const handleCancelSubscription = async () => {
        const functions = getFunctions();
        const cancelStripeSubscription = httpsCallable(functions, 'cancelStripeSubscription');
        setIsLoading(true);
        cancelStripeSubscription().then(() => {
            alert('Your subscription will be canceled at the end of the current billing period.');
            setIsLoading(false);
        }).catch(error => {
            console.error('Error canceling subscription:', error);
            alert('Failed to cancel subscription. Please try again.');
        });
    };

    return (
        <div className="user-container">
            <FontAwesomeIcon icon={faUser} className="user-icon2" />
            {isLoading ? (
                <RouletteLoader />
            ) : error ? (
                <p className="error">{error}</p>
            ) : (
                <>
                    <p className="container2 email">{userData.email || 'Email not found'}</p>
                    <p className="container2">{userData.name || 'Name not found'}</p>
                    <p className="container2 subscription-tier">{`Subscription Tier: ${userData.subscriptionTier}`}</p>
                    <p className="container2 uploads-left">{`Uploads Left: ${userData.uploads}`}</p>
                    {userData.subscriptionTier === 'Free' && (
                        <button className="subscribe-button" onClick={handleSubscribe}>
                            Subscribe Now
                        </button>
                    )}
                    {userData.subscriptionTier !== 'Free' && userData.subscriptionTier !== 'Expiring' && (
                        <button className="cancel-subscription-button" onClick={handleCancelSubscription}>
                            Cancel Subscription
                        </button>
                    )}
                    <button className="logout-button" onClick={handleLogout}>
                        Log Out
                    </button>
                </>
            )}
        </div>
    );
}

export default User;
