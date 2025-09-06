// src/App.js
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import io from 'socket.io-client';
import Login from './components/Login';
import Register from './components/Register';
import Chat from './components/Chat';
import './App.css';

const App = () => {
  const [socket, setSocket] = useState(null);
  const [user, setUser] = useState(null);
  
  useEffect(() => {
    // Check for stored user
    const storedUser = localStorage.getItem('chatUser');
    const storedToken = localStorage.getItem('chatToken');
    
    if (storedUser && storedToken) {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      
      // Initialize socket connection with token
      initializeSocket(storedToken);
    }
  }, []);
  
  const initializeSocket = (token) => {
    const newSocket = io('http://localhost:5000', {
      auth: { token }
    });
    
    newSocket.on('connect_error', (err) => {
      console.error('Socket connection error:', err.message);
      logout();
    });
    
    setSocket(newSocket);
    return newSocket;
  };
  
  const handleLogin = (userData, token) => {
    setUser(userData);
    localStorage.setItem('chatUser', JSON.stringify(userData));
    localStorage.setItem('chatToken', token);
    
    initializeSocket(token);
  };
  
  const logout = () => {
    if (socket) {
      socket.disconnect();
    }
    
    localStorage.removeItem('chatUser');
    localStorage.removeItem('chatToken');
    setUser(null);
    setSocket(null);
  };
  
  return (
    <Router>
      <div className="app">
        <Routes>
          <Route path="/login" element={
            user ? <Navigate to="/" /> : <Login onLogin={handleLogin} />
          } />
          <Route path="/register" element={
            user ? <Navigate to="/" /> : <Register onRegister={handleLogin} />
          } />
          <Route path="/" element={
            user && socket ? 
              <Chat user={user} socket={socket} onLogout={logout} /> : 
              <Navigate to="/login" />
          } />
        </Routes>
      </div>
    </Router>
  );
};

export default App;