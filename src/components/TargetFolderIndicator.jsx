import React, { useState } from 'react';
import { useTargetFolder } from '../context/TargetFolderContext';
import { useWorkingFolder } from '../context/WorkingFolderContext';
import { FolderIconWithIndicator, FOLDER_COLORS } from './FolderIconWithIndicator';
import './TargetFolderIndicator.css';

const TargetFolderIndicator = () => {
  const { targetFolderId, setTargetFolderId } = useTargetFolder();
  const { folders } = useWorkingFolder();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const currentFolder = folders.find(folder => folder.id === targetFolderId);
  const folderIdx = currentFolder ? folders.findIndex(f => f.id === currentFolder.id) : -1;
  const indicatorColor = folderIdx >= 0 ? FOLDER_COLORS[folderIdx % FOLDER_COLORS.length] : '#cfd8dc';
  const folderName = currentFolder ? currentFolder.name : 'No folder selected';
  const folderCount = currentFolder && Array.isArray(currentFolder.documents) ? currentFolder.documents.length : 0;

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  const handleSelectFolder = (folderId) => {
    setTargetFolderId(folderId);
    closeModal();
  };

  return (
    <>
      <div className="target-folder-indicator" onClick={openModal}>
        {currentFolder && (
          <FolderIconWithIndicator indicatorColor={indicatorColor} size={48} count={folderCount} style={{ marginRight: 0 }} />
        )}
        <span>{folderName}</span>
      </div>
      {isModalOpen && (
        <div className="folder-picker-modal">
          <div className="modal-content">
            <h2>Select Target Folder</h2>
            <ul>
              {folders.map((folder, idx) => (
                <li key={folder.id} onClick={() => handleSelectFolder(folder.id)} style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                  <FolderIconWithIndicator indicatorColor={FOLDER_COLORS[idx % FOLDER_COLORS.length]} size={40} count={Array.isArray(folder.documents) ? folder.documents.length : 0} style={{ marginRight: 0 }} />
                  <span>{folder.name}</span>
                </li>
              ))}
            </ul>
            <button onClick={closeModal}>Close</button>
          </div>
        </div>
      )}
    </>
  );
};

export default TargetFolderIndicator; 