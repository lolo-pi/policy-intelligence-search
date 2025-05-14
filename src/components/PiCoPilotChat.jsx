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
import historyIcon from '../assets/history_icon.svg';
import sourcesIcon from '../assets/sources_icon.svg';

const PiCoPilotChat = ({ showHistory, setShowHistory, showToggleButton, showSourcesPanel, setShowSourcesPanel, showSourcesToggleButton }) => {
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
  const [hovered, setHovered] = React.useState(false);
  const [dropdownHoveredIdx, setDropdownHoveredIdx] = React.useState(null);
  const [pendingQuestion, setPendingQuestion] = React.useState(null);

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
    setPendingQuestion(question);
    handleChatSubmit(question);
    setQuestion('');
  };

  React.useEffect(() => {
    if (!isLoading && pendingQuestion) {
      setPendingQuestion(null);
    }
  }, [isLoading]);

  // Determine which thread to display
  const thread =
    typeof activeThreadIndex === 'number' && chatHistory[activeThreadIndex]
      ? chatHistory[activeThreadIndex]
      : null;

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
          <div ref={folderIconRef} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            {selectedFolder ? (
              <div
                onClick={() => setShowFolderDropdown((v) => !v)}
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  cursor: 'pointer',
                  padding: '2px 10px 2px 10px',
                  borderRadius: 6,
                  transition: 'background 0.15s',
                  background: hovered || showFolderDropdown ? '#e0f0ff' : 'transparent',
                }}
                tabIndex={0}
                aria-label="Select folder"
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setShowFolderDropdown((v) => !v); }}
              >
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
                  onMouseEnter={() => setHovered(true)}
                  onMouseLeave={() => setHovered(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    cursor: 'pointer',
                    padding: '2px 10px 2px 10px',
                    borderRadius: 6,
                    transition: 'background 0.15s',
                    background: hovered || showFolderDropdown ? '#e0f0ff' : 'transparent',
                  }}
                  tabIndex={0}
                  aria-label="Select folder"
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setShowFolderDropdown((v) => !v); }}
                >
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
                    background: dropdownHoveredIdx === -1 ? '#f2faff' : (!selectedFolder ? '#e0f0ff' : 'transparent'),
                    transition: 'background 0.2s',
                    marginBottom: 2,
                  }}
                  onClick={() => {
                    setSelectedFolder(null);
                    setShowFolderDropdown(false);
                  }}
                  onMouseEnter={() => setDropdownHoveredIdx(-1)}
                  onMouseLeave={() => setDropdownHoveredIdx(null)}
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
                        cursor: 'not-allowed',
                        background: selectedFolder && selectedFolder.id === folder.id ? '#e0f0ff' : 'transparent',
                        transition: 'background 0.2s',
                        marginBottom: 2,
                        opacity: 0.55,
                        pointerEvents: 'none',
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
                <div style={{ padding: '10px 8px 4px 8px', color: '#888', fontSize: 13, fontStyle: 'italic', textAlign: 'center', borderTop: '1px solid #f0f0f0', marginTop: 6 }}>
                  Coming soon: Chat with Folders
                </div>
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

        {/* Show pending user question and loading spinner at the top, styled consistently */}
        {pendingQuestion && (
          <>
            <div className="message user" style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
              <div className="message-content" style={{
                whiteSpace: 'pre-wrap',
                marginRight: 12,
                background: '#457b9d',
                color: 'white',
                borderRadius: 12,
                padding: '12px 16px',
                fontSize: 15,
                fontWeight: 500,
                maxWidth: '70%',
                minWidth: 40,
                width: 'auto',
                display: 'inline-block',
                wordBreak: 'break-word',
                boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
                transition: 'width 0.2s',
              }}>
                {pendingQuestion}
              </div>
              <span className="user-icon" style={{ marginLeft: 0 }}>
                <FaUser />
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60px', margin: '12px 0' }}>
              <LoadingSpinner />
            </div>
          </>
        )}

        {/* Only show the thread if not loading and not pending */}
        {!isLoading && !pendingQuestion && thread && (
          <>
            {/* User message - match loading style */}
            <div className="message user" style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
              <div className="message-content" style={{
                whiteSpace: 'pre-wrap',
                marginRight: 12,
                background: '#457b9d',
                color: 'white',
                borderRadius: 12,
                padding: '12px 16px',
                fontSize: 15,
                fontWeight: 500,
                maxWidth: '70%',
                minWidth: 40,
                width: 'auto',
                display: 'inline-block',
                wordBreak: 'break-word',
                boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
                transition: 'width 0.2s',
              }}>
                {thread.question}
              </div>
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
      <div className="search-input-container" style={{ position: 'relative', zIndex: 20, display: 'flex', alignItems: 'center' }}>
        {showToggleButton && (
          <button
            className="history-btn"
            style={{ marginRight: 12, background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            onClick={() => setShowHistory(true)}
            aria-label="Show message history"
          >
            <img src={historyIcon} alt="Show history" style={{ width: 28, height: 28, display: 'block' }} />
          </button>
        )}
        {showSourcesToggleButton && (
          <button
            className="sources-btn"
            style={{ marginRight: 12, background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            onClick={() => setShowSourcesPanel(true)}
            aria-label="Show sources panel"
          >
            <img src={sourcesIcon} alt="Show sources" style={{ width: 28, height: 28, display: 'block' }} />
          </button>
        )}
        <form onSubmit={handleSubmit} style={{ width: '100%', display: 'flex', position: 'relative' }}>
          <textarea
            className="dynamic-search-input responsive-chat-input"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask a question..."
            disabled={isLoading}
            rows={1}
            style={{ resize: 'none', minWidth: 60, maxWidth: '100%', width: `${Math.min(600, Math.max(60, question.length * 10))}px`, overflow: 'hidden', transition: 'width 0.2s', paddingTop: 12, paddingBottom: 12, paddingLeft: 16, paddingRight: 16 }}
            onInput={e => {
              e.target.style.height = 'auto';
              e.target.style.height = e.target.scrollHeight + 'px';
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
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