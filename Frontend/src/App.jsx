import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { PrivateRoute } from './components/PrivateRoute';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import './App.css';

function HomePage() {
  const { user, logout } = useAuth();

  return (
    <div className="home-shell">
      <header className="home-header">
        <div>
          <span className="tagline">Welcome back</span>
          <h1>Hello {user?.username || 'User'}</h1>
          <p>Your dashboard is ready</p>
        </div>
        <button className="button-secondary" onClick={logout}>
          Logout
        </button>
      </header>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/"
            element={
              <PrivateRoute>
                <HomePage />
              </PrivateRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;


