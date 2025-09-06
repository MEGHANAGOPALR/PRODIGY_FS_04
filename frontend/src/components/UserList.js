// src/components/UserList.js
import React from 'react';

const UserList = ({ users, currentUser, onStartPrivateChat }) => {
  const filteredUsers = users.filter(user => user._id !== currentUser.id);
  
  return (
    <div className="user-list">
      <h3>Users</h3>
      
      <ul>
        {filteredUsers.map(user => (
          <li 
            key={user._id}
            onClick={() => onStartPrivateChat(user)}
          >
            <div className="user-info">
              <span className={`status-indicator ${user.status}`} />
              <span className="username">{user.username}</span>
            </div>
            <div className="user-action">
              <button className="btn-message">Message</button>
            </div>
          </li>
        ))}
        
        {filteredUsers.length === 0 && (
          <li className="no-users">No other users online</li>
        )}
      </ul>
    </div>
  );
};

export default UserList;