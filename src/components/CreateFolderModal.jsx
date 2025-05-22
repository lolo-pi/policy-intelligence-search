import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { FaTimes } from 'react-icons/fa';
import './CreateFolderModal.css';

const CreateFolderModal = ({ isOpen, onClose, onCreateFolder }) => {
  const [folderName, setFolderName] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (folderName.trim()) {
      console.log("CreateFolderModal - Creating folder with name:", folderName.trim());
      onCreateFolder(folderName.trim());
      setFolderName('');
      onClose();
    }
  };

  const preventPropagation = (e) => {
    e.stopPropagation();
  };

  const modalContent = (
    <div className="create-folder-overlay" onClick={onClose}>
      <div className="create-folder-modal" onClick={preventPropagation}>
        <div className="create-folder-header">
          <h3>Create New Folder</h3>
          <button className="close-button" onClick={onClose}>
            <FaTimes />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="create-folder-form">
          <div className="form-group">
            <label htmlFor="folderName">Folder Name</label>
            <input
              type="text"
              id="folderName"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder="Enter folder name"
              autoFocus
            />
          </div>
          <div className="form-actions">
            <button type="button" className="cancel-button" onClick={onClose}>
              Cancel
            </button>
            <button 
              type="submit" 
              className="create-button"
              disabled={!folderName.trim()}
            >
              Create Folder
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalContent, document.body);
};

export default CreateFolderModal; 