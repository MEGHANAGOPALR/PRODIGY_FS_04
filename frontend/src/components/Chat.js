import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Sidebar from './Sidebar';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import RoomList from './RoomList';
import UserList from './UserList';

const Chat = ({ user, socket, onLogout }) => {
  const [rooms, setRooms] = useState([]);
  const [users, setUsers] = useState([]);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('rooms');
  const [typingUsers, setTypingUsers] = useState({});
  const typingTimeoutsRef = useRef({});
  
  // Configure API client
  const apiClient = axios.create({
    baseURL: 'http://localhost:5000/api',
    headers: {
      Authorization: `Bearer ${localStorage.getItem('chatToken')}`,
      'Content-Type': 'application/json'
    }
  });

  // ========================
  // Core Functions
  // ========================
  useEffect(() => {
    if (!socket) return;

    const fetchInitialData = async () => {
      try {
        setIsLoading(true);
        const [roomsRes, usersRes] = await Promise.all([
          apiClient.get('/rooms'),
          apiClient.get('/users')
        ]);
        
        setRooms(roomsRes.data);
        setUsers(usersRes.data);
        
        if (!currentRoom && roomsRes.data.length > 0) {
          handleRoomSelect(roomsRes.data[0]);
        }
      } catch (error) {
        console.error('Initial data error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialData();

    // Socket listeners
    socket.on('new-message', handleNewMessage);
    socket.on('room-created', handleRoomCreated);
    socket.on('room-updated', handleRoomUpdated);
    socket.on('user-status-change', handleUserStatusChange);
    socket.on('user-typing', handleUserTyping);
    socket.on('private-chat-initialized', handlePrivateChatInitialized);

    return () => {
      socket.off('new-message');
      socket.off('room-created');
      socket.off('room-updated');
      socket.off('user-status-change');
      socket.off('user-typing');
      socket.off('private-chat-initialized');
    };
  }, [socket]);

  useEffect(() => {
    if (!currentRoom) return;
    fetchMessages(currentRoom._id);
  }, [currentRoom]);

  // ========================
  // Message Handling
  // ========================
  const fetchMessages = async (roomId) => {
    try {
      const response = await apiClient.get(`/messages/${roomId}`);
      setMessages(response.data);
    } catch (error) {
      console.error('Message fetch error:', error);
    }
  };

  const handleNewMessage = (message) => {
    setMessages(prev => [...prev, message]);
  };

  const handleSendMessage = async (content, file) => {
    if (!content.trim() && !file) return;
    if (!currentRoom) return;

    let fileUrl = null;
    
    if (file) {
      const formData = new FormData();
      formData.append('file', file);
      
      try {
        const response = await apiClient.post('/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        fileUrl = response.data.fileUrl;
      } catch (error) {
        console.error('Upload error:', error);
        return;
      }
    }
    
    socket.emit('send-message', {
      content,
      roomId: currentRoom._id,
      isPrivate: currentRoom.isPrivate,
      recipientId: currentRoom.isPrivate ? 
        currentRoom.participants.find(p => p._id !== user.id)?._id : null,
      fileUrl
    });
  };

  // ========================
  // Room Handling
  // ========================
  const handleRoomSelect = async (room) => {
    setCurrentRoom(room);
    socket.emit('join-room', room._id);
    await fetchMessages(room._id);
  };

  const handleRoomCreated = (room) => {
    setRooms(prev => [...prev, room]);
  };

  const handleRoomUpdated = (room) => {
    setRooms(prev => prev.map(r => r._id === room._id ? room : r));
    if (currentRoom?._id === room._id) setCurrentRoom(room);
  };

  const handleCreateRoom = async (roomName) => {
    try {
      const response = await apiClient.post('/rooms', { name: roomName });
      handleRoomSelect(response.data);
    } catch (error) {
      console.error('Room creation error:', error);
    }
  };

  // ========================
  // User Handling
  // ========================
  const handleUserStatusChange = ({ userId, status }) => {
    setUsers(prev => prev.map(u => 
      u._id === userId ? { ...u, status } : u
    ));
  };

  const handleStartPrivateChat = (otherUser) => {
    socket.emit('init-private-chat', otherUser._id);
  };

  const handlePrivateChatInitialized = (room) => {
    setRooms(prev => {
      if (!prev.find(r => r._id === room._id)) {
        return [...prev, room];
      }
      return prev;
    });
    setCurrentRoom(room);
  };

  // ========================
  // Typing Indicators
  // ========================
  const handleTyping = (isTyping) => {
    if (!currentRoom) return;
    socket.emit('typing', {
      roomId: currentRoom._id,
      isTyping
    });
  };

  const handleUserTyping = ({ userId, isTyping }) => {
    if (isTyping) {
      setTypingUsers(prev => ({ ...prev, [userId]: true }));
      
      if (typingTimeoutsRef.current[userId]) {
        clearTimeout(typingTimeoutsRef.current[userId]);
      }
      
      typingTimeoutsRef.current[userId] = setTimeout(() => {
        setTypingUsers(prev => {
          const updated = { ...prev };
          delete updated[userId];
          return updated;
        });
      }, 3000);
    } else {
      setTypingUsers(prev => {
        const updated = { ...prev };
        delete updated[userId];
        return updated;
      });
      
      if (typingTimeoutsRef.current[userId]) {
        clearTimeout(typingTimeoutsRef.current[userId]);
      }
    }
  };

  // ========================
  // Helper Functions
  // ========================
  const getTypingIndicatorText = () => {
    const typingUserIds = Object.keys(typingUsers);
    if (typingUserIds.length === 0) return '';
    
    const typingUsernames = typingUserIds.map(id => {
      const user = users.find(u => u._id === id);
      return user ? user.username : 'Someone';
    });
    
    if (typingUsernames.length === 1) {
      return `${typingUsernames[0]} is typing...`;
    } else if (typingUsernames.length === 2) {
      return `${typingUsernames[0]} and ${typingUsernames[1]} are typing...`;
    } else {
      return 'Several people are typing...';
    }
  };

  const getRoomTitle = () => {
    if (!currentRoom) return 'Select a Room';
    
    if (currentRoom.isPrivate) {
      const otherUser = currentRoom.participants.find(p => p._id !== user.id);
      return otherUser ? otherUser.username : 'Private Chat';
    }
    
    return currentRoom.name;
  };

  const getActiveUsers = () => {
    if (!currentRoom) return [];
    
    return currentRoom.participants
      .map(participantId => {
        const userObj = users.find(u => u._id === participantId._id || u._id === participantId);
        return userObj || null;
      })
      .filter(Boolean);
  };

  // ========================
  // Render
  // ========================
  if (isLoading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="chat-container">
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onLogout={onLogout}
        user={user}
      >
        {activeTab === 'rooms' ? (
          <RoomList
            rooms={rooms}
            currentRoom={currentRoom}
            onRoomSelect={handleRoomSelect}
            onCreateRoom={handleCreateRoom}
          />
        ) : (
          <UserList
            users={users}
            currentUser={user}
            onStartPrivateChat={handleStartPrivateChat}
          />
        )}
      </Sidebar>
      
      <div className="chat-main">
        <div className="chat-header">
          <h2>{getRoomTitle()}</h2>
          <div className="room-participants">
            {getActiveUsers().length > 0 && (
              <>
                <span>Active: </span>
                {getActiveUsers().map((u, i) => (
                  <React.Fragment key={u._id}>
                    {i > 0 && ', '}
                    <span className={`user-status ${u.status}`}>{u.username}</span>
                  </React.Fragment>
                ))}
              </>
            )}
          </div>
        </div>
        
        <div className="chat-messages-container">
          {currentRoom ? (
            <>
              <MessageList 
                messages={messages} 
                currentUser={user} 
              />
              
              {Object.keys(typingUsers).length > 0 && (
                <div className="typing-indicator">
                  {getTypingIndicatorText()}
                </div>
              )}
              
              <MessageInput 
                onSendMessage={handleSendMessage} 
                onTyping={handleTyping}
              />
            </>
          ) : (
            <div className="no-room-selected">
              Select a room to start chatting
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Chat;