import React from 'react';
import './PiCoPilot.css';
import { useChat } from '../context/ChatContext';

const SourcesPanel = ({ showSourcesPanel = true, setShowSourcesPanel }) => {
  const { chatHistory, activeThreadIndex } = useChat();

  if (!showSourcesPanel) return null;

  // Get sources from the active thread
  const activeThread = typeof activeThreadIndex === 'number' && chatHistory[activeThreadIndex]
    ? chatHistory[activeThreadIndex]
    : null;
  const threadSources = activeThread ? activeThread.citations : [];

  return (
    <div className="citations-panel">
      <div className="citations-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span>Sources</span>
        {setShowSourcesPanel && (
          <button
            className="history-btn sources-hide-btn"
            style={{ marginLeft: 8 }}
            onClick={() => setShowSourcesPanel(false)}
            aria-label="Hide sources panel"
          >
            Hide
          </button>
        )}
      </div>
      <div className="citations-list">
        {threadSources && threadSources.length > 0 ? (
          threadSources.map((citation, index) => (
            <div key={index} className="citation-item">
              <a
                href={citation.pi_url || citation.url || '#'}
                className="citation-title"
                target="_blank"
                rel="noopener noreferrer"
              >
                {citation.title}
              </a>
              <div className="citation-text">
                {citation.jurisdiction && <div>Jurisdiction: {citation.jurisdiction}</div>}
                {citation.source && <div>Source: {citation.source}</div>}
                {citation.text && <div>{citation.text}</div>}
              </div>
            </div>
          ))
        ) : (
          <div style={{ color: '#888', fontStyle: 'italic', padding: '8px' }}>No sources for this answer.</div>
        )}
      </div>
    </div>
  );
};

export default SourcesPanel; 