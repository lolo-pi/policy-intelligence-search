import React from 'react';
import './PiCoPilot.css';
import { useChat } from '../context/ChatContext';
import aiTechnology from '../assets/Pi-CoPilot_Beta.svg';
import searchIcon from '../assets/Search-Icon.png';
import LoadingSpinner from './LoadingSpinner';
import { FaUser } from 'react-icons/fa';
import PIglobalFolder from '../assets/PI_global_folder.svg';
import { useWorkingFolder } from '../context/WorkingFolderContext';
import { FOLDER_COLORS, FolderIconWithIndicator } from './FolderIconWithIndicator';

const PiCoPilotChat = ({ showHistory, setShowHistory, showToggleButton }) => {
  const {
    question,
    setQuestion,
    answer,
    citations,
    isLoading,
    error,
    handleChatSubmit,
    chatHistory,
    activeThreadIndex,
    selectedFolder,
    setSelectedFolder
  } = useChat();

  const { folders } = useWorkingFolder();
  const [showFolderDropdown, setShowFolderDropdown] = React.useState(false);
  const folderIconRef = React.useRef();
  const messagesEndRef = React.useRef(null);

  const safeColors = Array.isArray(FOLDER_COLORS) && FOLDER_COLORS.length > 0 ? FOLDER_COLORS : ['#ccc'];

  React.useEffect(() => {
    if (!showFolderDropdown) return;
    const handleClick = (e) => {
      if (folderIconRef.current && !folderIconRef.current.contains(e.target)) {
        setShowFolderDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showFolderDropdown]);

  // Scroll to bottom of messages whenever chat history changes
  React.useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory, isLoading]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!question.trim()) return;
    handleChatSubmit(question);
  };

  return (
    <div className="chat-container" style={{ position: 'relative', zIndex: 10 }}>
      <div className="chat-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
        <span style={{ display: 'flex', alignItems: 'flex-end', gap: 4 }}>
          <h3 style={{ margin: 0, fontWeight: 600 }}>
            PI Co-Pilot
          </h3>
          <sub style={{ fontStyle: 'italic', fontSize: '0.7em', color: '#6096ba', marginLeft: 0, fontWeight: 550 }}>
            Beta
          </sub>
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative' }}>
          {showToggleButton && (
            <button
              className="history-btn"
              style={{ marginLeft: 12, whiteSpace: 'nowrap' }}
              onClick={() => setShowHistory(true)}
              aria-label="Show message history"
            >
              History
            </button>
          )}
          <div ref={folderIconRef} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            {selectedFolder ? (
              <div
                onClick={() => setShowFolderDropdown((v) => !v)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  cursor: 'pointer',
                  padding: '2px 10px 2px 10px',
                  borderRadius: 6,
                  transition: 'background 0.15s',
                  ...(showFolderDropdown ? { background: '#e0f0ff' } : {}),
                }}
                tabIndex={0}
                aria-label="Select folder"
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setShowFolderDropdown((v) => !v); }}
              >
                <span style={{ fontStyle: 'italic', fontSize: '0.6em', color: '#6096ba', marginRight: 8, verticalAlign: 'super', alignSelf: 'flex-start' }}>
                  Chatting with:
                </span>
                <FolderIconWithIndicator
                  indicatorColor={safeColors[folders.findIndex(f => f.id === selectedFolder.id) % safeColors.length]}
                  size={18}
                  count={Array.isArray(selectedFolder.documents) ? selectedFolder.documents.length : 0}
                  style={{ transform: 'scale(2.5)', marginLeft: 12 }}
                />
                <span style={{ marginLeft: 6, color: '#274C77', fontWeight: 600, fontSize: 15, letterSpacing: 0.5 }}>
                  {selectedFolder.name}
                </span>
                <span style={{ marginLeft: 10, fontSize: 13, color: '#c0c7d1' }}>▼</span>
              </div>
            ) : (
              <>
                <div
                  onClick={() => setShowFolderDropdown((v) => !v)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    cursor: 'pointer',
                    padding: '2px 10px 2px 10px',
                    borderRadius: 6,
                    transition: 'background 0.15s',
                    ...(showFolderDropdown ? { background: '#e0f0ff' } : {}),
                  }}
                  tabIndex={0}
                  aria-label="Select folder"
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setShowFolderDropdown((v) => !v); }}
                >
                  <span style={{ fontStyle: 'italic', fontSize: '0.6em', color: '#6096ba', marginRight: 8, verticalAlign: 'super', alignSelf: 'flex-start' }}>
                    Chatting with:
                  </span>
                  <img
                    src={PIglobalFolder}
                    alt="Global Folder"
                    style={{ height: 24, width: 24, display: 'block' }}
                  />
                  <span style={{ marginLeft: 6, color: '#274C77', fontWeight: 600, fontSize: 15, letterSpacing: 0.5 }}>
                    PI Global
                  </span>
                  <span style={{ marginLeft: 10, fontSize: 13, color: '#c0c7d1' }}>▼</span>
                </div>
              </>
            )}
            {showFolderDropdown && (
              <div style={{
                position: 'absolute',
                top: 32,
                right: 0,
                background: '#fff',
                border: '1.5px solid #e0e6ed',
                borderRadius: 10,
                boxShadow: '0 4px 16px rgba(39,76,119,0.10)',
                minWidth: 220,
                zIndex: 1000,
                padding: 6,
              }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '6px 10px',
                    borderRadius: 8,
                    cursor: 'pointer',
                    background: !selectedFolder ? '#e0f0ff' : 'transparent',
                    transition: 'background 0.2s',
                    marginBottom: 2,
                  }}
                  onClick={() => {
                    setSelectedFolder(null);
                    setShowFolderDropdown(false);
                  }}
                >
                  <img
                    src={PIglobalFolder}
                    alt="Global Folder"
                    style={{ height: 28, width: 28 }}
                  />
                  <span style={{ fontWeight: 600, color: '#274C77', fontSize: 15, flex: 1 }}>PI Global</span>
                </div>
                {folders.length > 0 && (
                  <div style={{ 
                    height: 1, 
                    background: '#e0e6ed', 
                    margin: '4px 0',
                    width: '100%' 
                  }} />
                )}
                {folders.length === 0 && (
                  <div style={{ padding: 12, color: '#888', fontStyle: 'italic' }}>No folders</div>
                )}
                {folders
                  .filter(folder => folder && Array.isArray(folder.documents))
                  .map((folder, idx) => (
                    <div
                      key={folder.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '6px 10px 6px 28px',
                        borderRadius: 8,
                        cursor: 'pointer',
                        background: selectedFolder && selectedFolder.id === folder.id ? '#e0f0ff' : 'transparent',
                        transition: 'background 0.2s',
                        marginBottom: 2,
                      }}
                      onClick={() => {
                        setSelectedFolder(folder);
                        setShowFolderDropdown(false);
                      }}
                    >
                      <FolderIconWithIndicator
                        indicatorColor={safeColors[idx % safeColors.length]}
                        size={18}
                        count={Array.isArray(folder.documents) ? folder.documents.length : 0}
                        style={{ transform: 'scale(2.5)' }}
                      />
                      <span style={{ fontWeight: 600, color: '#274C77', fontSize: 15, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{folder.name}</span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="chat-messages">
        {error && (
          <div style={{ color: 'red', margin: '20px 0', padding: '10px', backgroundColor: '#ffebee', borderRadius: '8px' }}>
            {error}
          </div>
        )}

        {isLoading && chatHistory.length === 0 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '120px' }}>
            <LoadingSpinner />
          </div>
        )}

        {/* Display all messages in the chat history */}
        {chatHistory.map((item, index) => (
          <React.Fragment key={index}>
            {/* User message */}
            <div className="message user" style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
              <div className="message-content" style={{ whiteSpace: 'pre-wrap', marginRight: '12px' }}>
                {item.question}
              </div>
              {/* User avatar (FaUser icon) */}
              <span className="user-icon" style={{ marginLeft: 0 }}>
                <FaUser />
              </span>
            </div>
            {/* Co-pilot (AI) message */}
            <div className="message">
              <img src={aiTechnology} alt="AI" className="message-avatar" />
              <div className="message-content" style={{ whiteSpace: 'pre-wrap' }}>
                {item.answer}
              </div>
            </div>
          </React.Fragment>
        ))}

        {/* Loading spinner for new messages */}
        {isLoading && chatHistory.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px 0' }}>
            <LoadingSpinner />
          </div>
        )}
        
        {/* Ref for auto-scrolling */}
        <div ref={messagesEndRef} />
      </div>
      <div className="search-input-container" style={{ position: 'relative', zIndex: 20 }}>
        <form onSubmit={handleSubmit} style={{ width: '100%', display: 'flex', position: 'relative' }}>
          <img src={searchIcon} alt="Search" className="search-input-icon" />
          <input
            type="text"
            className="dynamic-search-input"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask a question..."
            disabled={isLoading}
            style={{ width: '100%' }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          <button 
            type="submit" 
            className="dynamic-search-button"
            disabled={isLoading || !question.trim()}
            style={{ marginLeft: 0 }}
          >
            {isLoading ? 'Loading...' : 'Ask'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default PiCoPilotChat; 