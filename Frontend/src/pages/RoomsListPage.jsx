import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getAllRooms, joinRoom } from '../services/roomService';
import requestService from '../services/requestService';
import './RoomsPage.css';

export default function RoomsListPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [requestStates, setRequestStates] = useState({}); // Track request status per room
  const [pendingRequestsCounts, setPendingRequestsCounts] = useState({}); // Track pending count per room
  const [successMessage, setSuccessMessage] = useState('');

  // Fetch rooms
  useEffect(() => {
    const fetchRooms = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getAllRooms(page, 10, search);
        setRooms(data.rooms);
        setTotalPages(data.pagination.pages);

        // Fetch pending requests for rooms where user is admin
        const countsMap = {};
        for (const room of data.rooms) {
          if (room.owner._id === user?._id) {
            try {
              const reqData = await requestService.getPendingRequests(room._id);
              countsMap[room._id] = (reqData.requests || []).length;
            } catch (err) {
              console.error(`Error fetching requests for room ${room._id}:`, err);
            }
          }
        }
        setPendingRequestsCounts(countsMap);
      } catch (err) {
        setError(err.message || 'Failed to load rooms');
        console.error('Error fetching rooms:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRooms();
  }, [page, search, user?._id]);

  // Handle join room
  const handleJoinRoom = async (roomId) => {
    try {
      await joinRoom(roomId);
      setRequestStates({ ...requestStates, [roomId]: 'pending' });
      setSuccessMessage('Request sent! The room admin will review it.');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to send join request');
      console.error('Error joining room:', err);
    }
  };

  return (
    <div className="rooms-page">
      <div className="rooms-header">
        <div className="rooms-header-left">
          <button 
            onClick={() => navigate('/')} 
            className="home-button"
            title="Go to Home"
          >
            🏠
          </button>
          <h1>Chat Rooms</h1>
        </div>
        <button
          className="button-primary"
          onClick={() => navigate('/create-room')}
        >
          + Create Room
        </button>
      </div>

      <div className="rooms-search">
        <input
          type="text"
          placeholder="Search rooms..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="search-input"
        />
      </div>

      {error && <div className="error-message">{error}</div>}

      {successMessage && <div className="success-message">{successMessage}</div>}

      {loading ? (
        <div className="loading-container">
          <p>Loading rooms...</p>
        </div>
      ) : rooms.length === 0 ? (
        <div className="empty-state">
          <p>No rooms found</p>
          <button
            className="button-primary"
            onClick={() => navigate('/create-room')}
          >
            Create the first room
          </button>
        </div>
      ) : (
        <>
          <div className="rooms-grid">
            {rooms.map((room) => (
              <div key={room._id} className="room-card">
                <div className="room-card-header">
                  <h3>{room.name}</h3>
                  <div className="room-card-badges">
                    <span className="room-members">{room.members.length}/{room.maxMembers}</span>
                    {room.owner._id === user?._id && pendingRequestsCounts[room._id] > 0 && (
                      <span className="pending-requests-badge">{pendingRequestsCounts[room._id]} requests</span>
                    )}
                  </div>
                </div>

                <p className="room-description">{room.description || 'No description'}</p>

                <div className="room-info">
                  <small className="room-owner">Owner: {room.owner.username}</small>
                  <small className="room-created">
                    Created: {new Date(room.createdAt).toLocaleDateString()}
                  </small>
                </div>

                <div className="room-members-preview">
                  <span className="members-label">Members:</span>
                  {room.members.slice(0, 3).map((member) => (
                    <span key={member._id} className="member-badge">
                      {member.username}
                    </span>
                  ))}
                  {room.members.length > 3 && (
                    <span className="member-badge">+{room.members.length - 3}</span>
                  )}
                </div>

                {room.members.some((m) => {
                  // Handle both object with _id and string ID
                  const memberId = typeof m === 'string' ? m : m._id;
                  return memberId === user?._id;
                }) ? (
                  <button
                    className="button-secondary"
                    onClick={() => navigate(`/chat/${room._id}`)}
                  >
                    Open Chat
                  </button>
                ) : requestStates[room._id] === 'pending' ? (
                  <button
                    className="button-pending"
                    disabled
                  >
                    ⏳ Request Pending
                  </button>
                ) : requestStates[room._id] === 'rejected' ? (
                  <button
                    className="button-rejected"
                    disabled
                  >
                    ✕ Request Rejected
                  </button>
                ) : (
                  <button
                    className="button-primary"
                    onClick={() => handleJoinRoom(room._id)}
                  >
                    Join Room
                  </button>
                )}
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
                className="button-secondary"
              >
                ← Previous
              </button>
              <span className="pagination-info">
                Page {page} of {totalPages}
              </span>
              <button
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
                className="button-secondary"
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
