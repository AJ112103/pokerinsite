import React, { useState, useEffect } from 'react';
import { auth } from './firebase';
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGoogle } from '@fortawesome/free-brands-svg-icons';
import { useNavigate } from 'react-router-dom';
import './Login.css';

function Login() {
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
    const navigate = useNavigate(); // Initialize useNavigate

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
            .then((result) => {
                const user = result.user;
                console.log('User:', user);
                navigate('/add-session'); // Navigate to home after successful login
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
            </div>
        </div>
    );
}

export default Login;
