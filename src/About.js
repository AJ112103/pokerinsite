import React from 'react';
import './About.css';

const About = () => {
    return (
        <div className="about-container">
            <h1>Welcome to Pokerin.site</h1>
            <p>
                Pokerin.site is your ultimate poker companion, designed to help you stay on top of your game. Our platform offers powerful tools to manage your bankroll and gain deep insights into your poker sessions, all in one place.
            </p>
            <h2>Our Mission</h2>
            <p>
                Our mission is to provide poker players with the tools and insights they need to improve their game and manage their bankroll effectively. Whether you're a seasoned pro or just starting, Pokerin.site is here to help you make informed decisions and sharpen your strategy.
            </p>
            <h2>What We Offer</h2>
            <ul>
                <li><strong>Bankroll Management:</strong> Easily manage your bankroll by importing your Poker Now links, track your performance, and make sure you're playing within your limits.</li>
                <li><strong>Player Stats:</strong> Get detailed statistics on players in your game, including VPIP, percentage of flops seen, turns seen, and more. Use these insights to understand your opponents and adjust your strategy.</li>
                <li><strong>Hand History Analysis:</strong> Sort through your hands, see how many you've won or lost, the amount you've won or lost, and filter by specific opponents. Gain a clearer picture of your performance and where you can improve.</li>
            </ul>
        </div>
    );
}

export default About;