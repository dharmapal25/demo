import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createRoom } from '../services/roomService';
import './CreateRoom.css';

export default function CreateRoomPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    maxMembers: 20,
    isPrivate: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!formData.name.trim()) {
        throw new Error('Room name is required');
      }

      if (formData.name.trim().length < 3) {
        throw new Error('Room name must be at least 3 characters');
      }

      const response = await createRoom(formData);
      navigate(`/chat/${response.room._id}`);
    } catch (err) {
      setError(err.message || 'Failed to create room');
      console.error('Error creating room:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-room-page">
      <button 
        onClick={() => navigate('/rooms')} 
        className="back-button"
        title="Back to Rooms"
      >
        ← Back to Rooms
      </button>
      <div className="create-room-container">
        <h2>Create a New Chat Room</h2>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit} className="create-room-form">
          <div className="form-group">
            <label htmlFor="name">Room Name *</label>
            <input
              id="name"
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter room name"
              required
              minLength="3"
              maxLength="100"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Enter room description (optional)"
              maxLength="500"
              rows="4"
              disabled={loading}
            />
            <small>{formData.description.length}/500</small>
          </div>

          <div className="form-group">
            <label htmlFor="maxMembers">Maximum Members</label>
            <input
              id="maxMembers"
              type="number"
              name="maxMembers"
              value={formData.maxMembers}
              onChange={handleChange}
              min="2"
              max="1000"
              disabled={loading}
            />
          </div>

          <div className="form-group checkbox">
            <label htmlFor="isPrivate">
              <input
                id="isPrivate"
                type="checkbox"
                name="isPrivate"
                checked={formData.isPrivate}
                onChange={handleChange}
                disabled={loading}
              />
              <span>Make this room private</span>
            </label>
            <small>Private rooms are not visible in the public room list</small>
          </div>

          <div className="form-actions">
            <button
              type="submit"
              className="button-primary"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Room'}
            </button>
            <button
              type="button"
              className="button-secondary"
              onClick={() => navigate('/rooms')}
              disabled={loading}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
