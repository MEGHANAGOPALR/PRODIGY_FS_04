// src/components/Message.js
import React from 'react';

const Message = ({ message, isOwnMessage }) => {
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  return (
    <div className={`message ${isOwnMessage ? 'own-message' : ''}`}>
      <div className="message-header">
        <span className="sender-name">
          {isOwnMessage ? 'You' : message.sender.username}
        </span>
        <span className="message-time">
          {formatTime(message.createdAt)}
        </span>
      </div>
      
      <div className="message-content">
        {message.content}
        
        {message.fileUrl && (
          <div className="message-attachment">
            {message.fileUrl.match(/\.(jpeg|jpg|gif|png)$/i) ? (
              <img 
                src={message.fileUrl} 
                alt="Attachment" 
                className="message-image"
              />
            ) : (
              <a href={message.fileUrl} target="_blank" rel="noopener noreferrer" className="file-link">
                📎 Attachment
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Message;