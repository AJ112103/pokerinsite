import React from 'react';
import { Navigate } from 'react-router-dom';
import { auth } from './firebase'; // Import the auth instance

function PrivateRoute({ children }) {
    const user = auth.currentUser; // Get the current user from Firebase

    return user ? children : <Navigate to="/" />;
}

export default PrivateRoute;
