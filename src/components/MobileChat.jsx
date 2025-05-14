import React, { useRef, useEffect, useState } from 'react';
import { useChat } from '../context/ChatContext';
import piAILogo from '../assets/PI AI logo.svg';
import './MobileChat.css';

const MobileChat = () => {
  const {
    question,
    setQuestion,
    answer,
    citations,
    isLoading,
    error,
    handleChatSubmit,
    chatHistory
  } = useChat();
  const messagesEndRef = useRef(null);
  const loadingQuestionRef = useRef(null);
  const chatMessagesRef = useRef(null);

  // Only transition after actual submit
  const [hasSubmitted, setHasSubmitted] = useState(false);

  // If there is chat history, skip starting state
  useEffect(() => {
    if (chatHistory && chatHistory.length > 0) {
      setHasSubmitted(true);
      setInputBarTransition('bottom');
    }
  }, [chatHistory.length]);

  // Crossfade transition for input bar
  const isStartingState = !hasSubmitted && !answer && !error && !isLoading;
  const [inputBarTransition, setInputBarTransition] = useState(isStartingState ? 'centered' : 'bottom');
  const prevIsStartingState = useRef(isStartingState);

  useEffect(() => {
    if (prevIsStartingState.current && !isStartingState) {
      setInputBarTransition('fadingOut');
      setTimeout(() => {
        setInputBarTransition('fadingIn');
        setTimeout(() => {
          setInputBarTransition('bottom');
        }, 700);
      }, 700);
    }
    if (!prevIsStartingState.current && isStartingState) {
      setInputBarTransition('centered');
      setHasSubmitted(false);
    }
    prevIsStartingState.current = isStartingState;
  }, [isStartingState]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory.length, isLoading]);

  // On initial load, scroll so the last submitted question is at the top
  useEffect(() => {
    if (
      chatMessagesRef.current &&
      chatHistory &&
      chatHistory.length > 0 &&
      !isLoading
    ) {
      // Find the last user message div
      const userMessages = chatMessagesRef.current.querySelectorAll('.message.user');
      if (userMessages.length > 0) {
        const lastUserMessage = userMessages[userMessages.length - 1];
        const container = chatMessagesRef.current;
        const containerRect = container.getBoundingClientRect();
        const messageRect = lastUserMessage.getBoundingClientRect();
        // Add extra offset so the question is a bit below the top
        const extraOffset = 32;
        container.scrollTop += (messageRect.top - containerRect.top) - extraOffset;
      }
    }
  }, [chatHistory.length, isLoading]);

  useEffect(() => {
    if (isLoading && loadingQuestionRef.current && chatMessagesRef.current) {
      // Scroll so the loading question is at the top of the chat view
      const container = chatMessagesRef.current;
      const loadingNode = loadingQuestionRef.current;
      const containerRect = container.getBoundingClientRect();
      const loadingRect = loadingNode.getBoundingClientRect();
      // Scroll so the loading message is at the top
      container.scrollTop += (loadingRect.top - containerRect.top);
    }
  }, [isLoading, question]);

  const handleSend = async () => {
    if (!question.trim()) return;
    setHasSubmitted(true);
    handleChatSubmit(question);
  };

  return (
    <div className="mobile-chat">
      {!(inputBarTransition === 'centered' || inputBarTransition === 'fadingOut') && (
        <div className="chat-messages" ref={chatMessagesRef}>
          {/* Render chat history first */}
          {chatHistory && chatHistory.length > 0 && chatHistory.map((entry, idx) => (
            <React.Fragment key={idx}>
              <div
                className="message user"
                ref={!isLoading && idx === chatHistory.length - 1 ? messagesEndRef : null}
                style={{ width: 'auto', marginBottom: 0, alignSelf: 'flex-end', background: '#457b9d', color: 'white', borderRadius: 12, padding: '12px 16px', fontSize: 15, fontWeight: 500, maxWidth: '100%', boxShadow: '0 1px 2px rgba(0,0,0,0.08)', wordBreak: 'break-word', display: 'inline-block' }}
              >
                {entry.question}
              </div>
              <div className="message assistant" style={{ width: '100%' }}>
                <div style={{ whiteSpace: 'pre-wrap' }}>{entry.answer}</div>
                {entry.citations && entry.citations.length > 0 && (
                  <div style={{ marginTop: '16px', borderTop: '1px solid #e0e0e0', paddingTop: '10px' }}>
                    <div style={{ fontWeight: 600, color: '#274C77', marginBottom: 6 }}>Sources:</div>
                    <ul style={{ paddingLeft: 16, margin: 0 }}>
                      {entry.citations.map((citation, cidx) => (
                        <li key={cidx} style={{ marginBottom: 8 }}>
                          <a href={citation.pi_url} target="_blank" rel="noopener noreferrer" style={{ color: '#0073bb', textDecoration: 'none', fontWeight: 500 }}>
                            {citation.title}
                          </a>
                          <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
                            {citation.jurisdiction && `Jurisdiction: ${citation.jurisdiction}`}
                            {citation.source && <div>Source: {citation.source}</div>}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </React.Fragment>
          ))}
          {/* Show the current question at the bottom while loading */}
          {isLoading && question.trim() && (
            <React.Fragment>
              <div
                className="message user"
                ref={loadingQuestionRef}
                style={{ width: 'auto', marginBottom: 0, alignSelf: 'flex-end', background: '#457b9d', color: 'white', borderRadius: 12, padding: '12px 16px', fontSize: 15, fontWeight: 500, maxWidth: '100%', boxShadow: '0 1px 2px rgba(0,0,0,0.08)', wordBreak: 'break-word', display: 'inline-block', marginTop: 0 }}
              >
                {question}
              </div>
              <div className="message assistant" style={{ width: '100%' }}>
                <div className="typing-indicator" style={{ marginTop: 16 }}>
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </React.Fragment>
          )}
          {/* Show error for the current message if present */}
          {error && (
            <div className="message assistant" style={{ width: '100%' }}>
              <div style={{ color: 'red', background: '#ffebee', padding: 8, borderRadius: 8, marginBottom: 12 }}>{error}</div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      )}
      {/* Crossfade input bar: centered (fade-out) and bottom (fade-in) */}
      {(inputBarTransition === 'centered' || inputBarTransition === 'fadingOut') && (
        <>
          <div className={`chat-input centered crossfade${inputBarTransition === 'fadingOut' ? ' fade-out' : ''}`}
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '90vw',
              maxWidth: 480,
              boxShadow: '0 4px 24px rgba(0,0,0,0.13)',
              borderRadius: 18,
              zIndex: 200
            }}
          >
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask about your documents..."
              disabled={isLoading}
            />
            <button 
              onClick={handleSend}
              disabled={isLoading || !question.trim()}
              aria-label="Send message"
            >
              <img src={piAILogo} alt="Send" className="send-icon" />
            </button>
          </div>
          {/* Cheat: cover the bottom with a box in the starting state of Co-Pilot */}
          <div style={{
            position: 'fixed',
            left: 0,
            right: 0,
            bottom: 0,
            height: 64,
            background: '#f8f9fa',
            zIndex: 101
          }} />
        </>
      )}
      {(inputBarTransition === 'bottom' || inputBarTransition === 'fadingIn') && (
        <div className={`chat-input crossfade${inputBarTransition === 'fadingIn' ? ' fade-in' : ''}`}>
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask about your documents..."
            disabled={isLoading}
          />
          <button 
            onClick={handleSend}
            disabled={isLoading || !question.trim()}
            aria-label="Send message"
          >
            <img src={piAILogo} alt="Send" className="send-icon" />
          </button>
        </div>
      )}
    </div>
  );
};

export default MobileChat; 