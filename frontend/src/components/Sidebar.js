// src/components/Sidebar.js
import React from 'react';

const Sidebar = ({ children, activeTab, onTabChange, onLogout, user }) => {
  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h2>Chat App</h2>
        <div className="user-info">
          <span className="username">{user.username}</span>
          <button onClick={onLogout} className="btn-logout">
            Logout
          </button>
        </div>
      </div>
      
      <div className="sidebar-tabs">
        <button 
          className={`tab ${activeTab === 'rooms' ? 'active' : ''}`}
          onClick={() => onTabChange('rooms')}
        >
          Rooms
        </button>
        <button 
          className={`tab ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => onTabChange('users')}
        >
          Users
        </button>
      </div>
      
      <div className="sidebar-content">
        {children}
      </div>
    </div>
  );
};

export default Sidebar;