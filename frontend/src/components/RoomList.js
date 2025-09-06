// src/components/RoomList.js
import React, { useState } from 'react';

const RoomList = ({ rooms, currentRoom, onRoomSelect, onCreateRoom }) => {
  const [newRoomName, setNewRoomName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  
  const handleCreateRoom = (e) => {
    e.preventDefault();
    
    if (!newRoomName.trim()) return;
    
    onCreateRoom(newRoomName);
    setNewRoomName('');
    setIsCreating(false);
  };
  
  return (
    <div className="room-list">
      <div className="list-header">
        <h3>Chat Rooms</h3>
        <button 
          className="btn-add" 
          onClick={() => setIsCreating(!isCreating)}
        >
          {isCreating ? 'Cancel' : '+ New'}
        </button>
      </div>
      
      {isCreating && (
        <form onSubmit={handleCreateRoom} className="room-form">
          <input
            type="text"
            placeholder="Room name"
            value={newRoomName}
            onChange={(e) => setNewRoomName(e.target.value)}
            autoFocus
          />
          <button type="submit">Create</button>
        </form>
      )}
      
      <ul>
        {rooms.map(room => (
          <li 
            key={room._id}
            className={currentRoom && currentRoom._id === room._id ? 'active' : ''}
            onClick={() => onRoomSelect(room)}
          >
            <div className="room-name">
              {room.isPrivate ? '🔒 ' : '# '}
              {room.isPrivate 
                ? (room.participants.find(p => p._id !== (currentRoom?.user?.id || ''))?.username || 'Private Chat')
                : room.name
              }
            </div>
            
            {room.participants && (
              <div className="room-users-count">
                {room.participants.length} users
              </div>
            )}
          </li>
        ))}
        
        {rooms.length === 0 && (
          <li className="no-rooms">No rooms available</li>
        )}
      </ul>
    </div>
  );
};

export default RoomList;