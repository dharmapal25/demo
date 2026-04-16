import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function HomePage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="home-shell">
      <header className="home-header">
        <div>
          <span className="tagline">Welcome back</span>
          <h2>Hello {user?.username || 'User'}</h2>
        </div>
        <div className="header-buttons">
          <button
            className="button-primary"
            onClick={() => navigate('/rooms')} >
            Join Rooms
          </button>
          <button className="button-secondary" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      <div className="dashboard-content">
        <section className="hero-card">
          <div className="hero-details">
            <h2>Real-time chat with Socket.IO</h2>
            <p>
              Join chat rooms, connect with others, and have real-time conversations.
              Messages are delivered instantly using WebSocket technology.
            </p>
          </div>
          <div className="hero-info">
            <div className="hero-stat">
              <span>Real-time</span>
              <small>Instant messaging</small>
            </div>
            <div className="hero-stat">
              <span>Live</span>
              <small>User notifications</small>
            </div>
          </div>
        </section>

        <section className="card-grid">
          <article className="overview-card">
            <h3>🚀 Get Started</h3>
            <p>
              Navigate to the chat rooms section to start a conversation or create your own room.
            </p>
            <button 
              className="button-link"
              onClick={() => navigate('/rooms')}
            >
              Browse Rooms →
            </button>
          </article>

          <article className="overview-card">
            <h3>💬 Create Room</h3>
            <p>
              Want your own space? Create a chat room and invite others to join.
              You'll be the room owner and can manage members.
            </p>
            <button 
              className="button-link"
              onClick={() => navigate('/create-room')}
            >
              Create Room →
            </button>
          </article>

          <article className="overview-card">
            <h3>👥 Your Account</h3>
            <p>
              <strong>Username:</strong> {user?.username || 'Loading...'}<br />
              <strong>Email:</strong> {user?.email || 'Loading...'}
            </p>
          </article>
        </section>
      </div>
    </div>
  );
}
