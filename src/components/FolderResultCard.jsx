import React from 'react';
import './FolderResultCard.css';

const FolderResultCard = ({ document, onRemove }) => {
  const handleRemove = () => {
    if (document?.id) {
      onRemove(document.id);
    }
  };

  return (
    <div className="folder-result-card">
      <div className="card-header">
        <h3 className="result-title">
          {document.url ? (
            <a href={document.url} target="_blank" rel="noopener noreferrer" className="clickable">{document.title}</a>
          ) : (
            <span className="clickable" style={{ cursor: 'pointer' }} onClick={() => console.log('Clicked document:', document.id, document.title)}>{document.title}</span>
          )}
        </h3>
        <button 
          className="remove-button" 
          onClick={handleRemove}
          aria-label="Remove from folder"
        >
          ×
        </button>
      </div>
      <p className="result-description">
        {document.description || 'No description available.'}
      </p>
      {/* <div className="result-tags">
        <span className="tag">{document.jurisdiction}</span>
        <span className="tag">{document.type}</span>
      </div> */}
    </div>
  );
};

export default FolderResultCard; 