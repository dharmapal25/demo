import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { PrivateRoute } from './components/PrivateRoute';
import FirstPage from './pages/FirstPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import HomePage from './pages/HomePage';
import RoomsListPage from './pages/RoomsListPage';
import ChatRoomPage from './pages/ChatRoomPage';
import CreateRoomPage from './pages/CreateRoomPage';
import './App.css';

function App() {

  return (
    <>
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<FirstPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <HomePage />
              </PrivateRoute>
            }
          />
          <Route
            path="/rooms"
            element={
              <PrivateRoute>
                <RoomsListPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/create-room"
            element={
              <PrivateRoute>
                <CreateRoomPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/chat/:roomId"
            element={
              <PrivateRoute>
                <ChatRoomPage />
              </PrivateRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
    </>
  );
}

export default App;