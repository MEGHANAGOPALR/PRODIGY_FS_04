// src/components/MessageList.js
import React, { useEffect, useRef } from 'react';
import Message from './Message';

const MessageList = ({ messages, currentUser }) => {
  const messagesEndRef = useRef(null);
  
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  return (
    <div className="message-list">
      {messages.length === 0 ? (
        <div className="no-messages">
          No messages yet. Start the conversation!
        </div>
      ) : (
        messages.map(message => (
          <Message
            key={message._id}
            message={message}
            isOwnMessage={message.sender._id === currentUser.id}
          />
        ))
      )}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageList;