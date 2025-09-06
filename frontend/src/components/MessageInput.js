// src/components/MessageInput.js
import React, { useState, useRef } from 'react';

const MessageInput = ({ onSendMessage, onTyping }) => {
  const [message, setMessage] = useState('');
  const [file, setFile] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!message.trim() && !file) return;
    
    onSendMessage(message, file);
    setMessage('');
    setFile(null);
    
    // Reset typing status
    setIsTyping(false);
    onTyping(false);
  };
  
  const handleMessageChange = (e) => {
    setMessage(e.target.value);
    
    // Handle typing indicator
    if (!isTyping) {
      setIsTyping(true);
      onTyping(true);
    }
    
    // Reset typing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set timeout to stop typing indicator after 3 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      onTyping(false);
    }, 3000);
  };
  
  const handleFileChange = (e) => {
    if (e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };
  
  const triggerFileInput = () => {
    fileInputRef.current.click();
  };
  
  const removeFile = () => {
    setFile(null);
    fileInputRef.current.value = '';
  };
  
  return (
    <form className="message-input" onSubmit={handleSubmit}>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
      
      <button 
        type="button" 
        className="btn-attach"
        onClick={triggerFileInput}
      >
        📎
      </button>
      
      <input
        type="text"
        value={message}
        onChange={handleMessageChange}
        placeholder="Type a message..."
        className="message-text-input"
      />
      
      <button type="submit" className="btn-send">
        Send
      </button>
      
      {file && (
        <div className="file-preview">
          <span className="file-name">{file.name}</span>
          <button 
            type="button" 
            className="btn-remove-file"
            onClick={removeFile}
          >
            ✕
          </button>
        </div>
      )}
    </form>
  );
};

export default MessageInput;