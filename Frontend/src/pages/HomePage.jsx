import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState } from 'react';
import dashboardImage from "../../public/happy.png"

export default function HomePage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const toggleTheme = () => {
    let html = document.documentElement;
    let theme = html.getAttribute('data-theme');
    let newTheme = theme === 'light' ? 'dark' : 'light'
    html.setAttribute('data-theme', newTheme );
    localStorage.setItem("mode",theme)
  };
  
  let local = localStorage.getItem('mode')
  let html = document.documentElement;
  html.setAttribute('data-theme',local === "dark" ? "light" : "dark");


  return (
    <div className="home-shell">
      <header className="home-header">
        <div>
          <span className="tagline">Welcome back</span>
          <h2>Hello {user?.username || 'User'}</h2>
        </div>
        <div className="header-buttons">
          <button className='theme-toggle-btn' onClick={toggleTheme} >☀</button>

          <button
            className="button-primary Join-Rooms"
            onClick={() => navigate('/rooms')} >
            Join Rooms
          </button>
          <button className="button-secondary logout" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      <div className="dashboard-content">
        <section className="dashboard-hero">
          <div className="dashboard-text">
            <h1>Welcome to FlashChat</h1>
            <p className="dashboard-intro">
              Connect with people around the world in real-time. Join chat rooms, create your own, and engage in meaningful conversations powered by Socket.IO technology.
            </p>

            <div className="dashboard-features">
              <div className="feature-block">
                <h3>⚡ Real-time Messaging</h3>
                <p>Send and receive messages instantly with WebSocket technology</p>
              </div>
              <div className="feature-block">
                <h3>🌍 Global Community</h3>
                <p>Join rooms and connect with people from around the world</p>
              </div>
              <div className="feature-block">
                <h3>🔧 Easy Management</h3>
                <p>Create rooms, manage members, and control access easily</p>
              </div>
            </div>

            <div className="dashboard-actions">
              <button className="action-btn primary" onClick={() => navigate('/rooms')}>
                Browse Rooms
              </button>
              <button className="action-btn secondary" onClick={() => navigate('/create-room')}>
                Create Room
              </button>
            </div>
          </div>

          <div className="dashboard-image">
            <img src={dashboardImage} alt="Dashboard" draggable={false} />
          </div>
        </section>

        <section className="user-info-section">
          <div className="user-card">
            <h2>Your Profile</h2>
            <div className="user-details">
              <div className="detail-item">
                <span className="label">Username</span>
                <span className="value">{user?.username || 'Loading...'}</span>
              </div>
              <div className="detail-item">
                <span className="label">Email</span>
                <span className="value">{user?.email || 'Loading...'}</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
