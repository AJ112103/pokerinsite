import React, { useState, useEffect } from 'react';
import { auth } from './firebase';
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGoogle } from '@fortawesome/free-brands-svg-icons';
import { useNavigate } from 'react-router-dom';
import { doc, setDoc, getFirestore, getDoc } from "firebase/firestore"; 
import { getFunctions, httpsCallable } from 'firebase/functions';
import SubscriptionPopup from './SubscriptionPopup';
import './Login.css';

function Login() {
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
    const navigate = useNavigate();

    const handleMouseMove = (event) => {
        setMousePosition({ x: event.clientX, y: event.clientY });
    };

    useEffect(() => {
        document.addEventListener('mousemove', handleMouseMove);
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
        };
    }, []);

    const handleLogin = () => {
        const provider = new GoogleAuthProvider();
        signInWithPopup(auth, provider)
            .then(async (result) => {
                const user = result.user;
                const db = getFirestore();
                const userRef = doc(db, 'users', user.uid);

                const docSnap = await getDoc(userRef);
                if (!docSnap.exists()) {
                    // Call Firebase function to create a Stripe customer
                    const functions = getFunctions();
                    const createStripeCustomer = httpsCallable(functions, 'createStripeCustomer');
                    const response = await createStripeCustomer({ email: user.email, name: user.displayName });
                    const stripeCustomerId = response.data.customerId;

                    // User does not exist, create new user document with Stripe customer ID
                    await setDoc(userRef, {
                        name: user.displayName,
                        email: user.email,
                        createdAt: new Date(),
                        uploads: 3,
                        subscriptionTier: "free",
                        stripeCustomerId: stripeCustomerId // Store the Stripe customer ID
                    });
                }

                // navigate('/add-session'); // Navigate to home after successful login
            })
            .catch((error) => {
                console.error('Error during sign-in:', error);
            });
    };

    return (
        <div className="login-container" style={{ '--mouse-x': `${mousePosition.x}px`, '--mouse-y': `${mousePosition.y}px` }}>
            <div className="login-card">
                <div className="welcome-box">
                    <h2>Welcome to <span className="highlight">pokerin.site</span></h2>
                    <p>The one stop shop for recreational poker players</p>
                    <button className="google-btn" onClick={handleLogin}>
                        <FontAwesomeIcon icon={faGoogle} style={{ marginRight: '10px', fontSize: '16px' }} /> Sign in with Google
                    </button>
                </div>
                <div>
                    <SubscriptionPopup />
                </div>
            </div>
        </div>
    );
}

export default Login;
