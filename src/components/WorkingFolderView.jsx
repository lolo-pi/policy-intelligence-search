import React from 'react';
import { FaTimes, FaTrash } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { useWorkingFolder } from '../context/WorkingFolderContext';
import aiTechnologyIcon from '../assets/AI-technology.png';
import './WorkingFolderView.css';

const WorkingFolderView = ({ isOpen, onClose, documents }) => {
  const navigate = useNavigate();
  const { removeFromWorkingFolder } = useWorkingFolder();
  
  if (!isOpen) return null;

  const handleRemove = (docId) => {
    if (docId) {
      removeFromWorkingFolder(docId);
    }
  };

  return (
    <div className="working-folder-overlay">
      <div className="working-folder-modal">
        <div className="working-folder-header">
          <h3>Working Folder Contents</h3>
          <div className="header-actions">
            <button 
              className="copilot-button" 
              onClick={() => {
                navigate('/copilot');
                onClose();
              }}
              title="Open in PI-Copilot"
            >
              <img src={aiTechnologyIcon} alt="PI-Copilot" className="copilot-icon" />
              <span className="copilot-text">PI Co-Pilot</span>
            </button>
            <button className="close-button" onClick={onClose}>
              <FaTimes />
            </button>
          </div>
        </div>
        <div className="working-folder-content">
          {documents.length === 0 ? (
            <p className="empty-message">No documents in working folder</p>
          ) : (
            <ul className="document-list">
              {documents.map((doc) => (
                <li key={doc.id} className="document-item">
                  <div className="document-info">
                    <span className="document-title">{doc.title}</span>
                    <span className="document-description">{doc.description}</span>
                    <div className="document-meta">
                      <span className="document-jurisdiction">{doc.jurisdiction}</span>
                      {doc.type && <span className="document-type">{doc.type}</span>}
                    </div>
                    {doc.s3Path && (
                      <div className="document-s3-path">
                        <span className="s3-path-label">S3 Path:</span>
                        <span className="s3-path-value">{doc.s3Path}</span>
                      </div>
                    )}
                  </div>
                  <button
                    className="remove-doc-button"
                    onClick={() => handleRemove(doc.id)}
                    title="Remove from Working Folder"
                  >
                    <FaTrash />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default WorkingFolderView; 