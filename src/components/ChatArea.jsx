import React, { useState } from 'react';
import './PiCoPilot.css';
import aiAvatar from '../assets/AI-technology.png';
import { useChunkedDocs } from '../context/ChunkedDocsContext';

const ChatArea = () => {
  const [message, setMessage] = useState('');
  const { chunks, isLoading } = useChunkedDocs();
  const [chatMessages, setChatMessages] = useState([
    {
      sender: 'ai',
      content: 'I can help you analyze documents. Add documents to your working folder, process them, and then ask me questions!'
    }
  ]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (message.trim()) {
      // Add user message to chat
      const userMessage = {
        sender: 'user',
        content: message.trim()
      };
      
      setChatMessages(prev => [...prev, userMessage]);
      
      // Check if documents have been processed
      if (chunks.length === 0) {
        setTimeout(() => {
          setChatMessages(prev => [
            ...prev, 
            {
              sender: 'ai',
              content: 'Please process some documents first. Add documents to your working folder and click "Process Documents" before asking questions.'
            }
          ]);
        }, 500);
      } else {
        // In the next step, we'll implement the actual chat functionality using the chunks
        setTimeout(() => {
          setChatMessages(prev => [
            ...prev, 
            {
              sender: 'ai',
              content: `I've analyzed ${chunks.length} chunks of text from your documents. This is a placeholder response - we'll implement the full chat functionality in Step 3.`
            }
          ]);
        }, 500);
      }
      
      // Clear input
      setMessage('');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="chat-container">
      <div className="chat-header">
        <div className="breadcrumb">
          <span>Pi Co-Pilot</span>
          <span className="breadcrumb-separator">&gt;</span>
          <span>Working Folder</span>
        </div>
      </div>

      <div className="chat-messages">
        {chatMessages.map((msg, index) => (
          <div key={index} className={`message ${msg.sender}`}>
            {msg.sender === 'ai' && (
              <img 
                src={aiAvatar}
                alt="AI" 
                className="message-avatar"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHJ4PSIxNiIgZmlsbD0iIzQ1N2I5ZCIvPjx0ZXh0IHg9IjE2IiB5PSIyMCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+QUk8L3RleHQ+PC9zdmc+';
                }}
              />
            )}
            <div className="message-content">
              {msg.content}
            </div>
          </div>
        ))}
      </div>

      <div className="chat-input-container">
        <form onSubmit={handleSubmit}>
          <div className="chat-input-wrapper">
            <textarea
              className="chat-input"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isLoading ? "Processing documents..." : "Message PI Co-Pilot..."}
              rows={1}
              disabled={isLoading}
            />
            <button 
              type="submit" 
              className="send-button"
              disabled={isLoading || message.trim() === ''}
            >
              Send
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChatArea; 