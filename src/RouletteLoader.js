import React from 'react';
import './RouletteLoader.css';
import spinnerImage from './pngtree-casino-gambling-roulette-icon-flat-style-png-image_1977272-removebg-preview.png';

const RouletteLoader = () => {
    return (
    <div className="spinner-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <img src={spinnerImage} alt="Loading..." className="spinner-img" />
    </div>
    );
};

export default RouletteLoader;
