import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import FirstPage from '../pages/FirstPage';

export function RootRoute() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
      </div>
    );
  }

  // If user is authenticated, redirect to dashboard
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  // Otherwise show FirstPage
  return <FirstPage />;
}

export default RootRoute;
