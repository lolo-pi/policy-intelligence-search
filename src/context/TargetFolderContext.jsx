import React, { createContext, useContext, useState } from 'react';

const TargetFolderContext = createContext();

export const useTargetFolder = () => useContext(TargetFolderContext);

export const TargetFolderProvider = ({ children }) => {
  const [targetFolderId, setTargetFolderId] = useState(null);
  const [showFolderModal, setShowFolderModal] = useState(false);

  const promptSelectFolder = () => {
    setShowFolderModal(true);
  };

  const closeFolderModal = () => {
    setShowFolderModal(false);
  };

  return (
    <TargetFolderContext.Provider value={{ 
      targetFolderId, 
      setTargetFolderId, 
      promptSelectFolder,
      showFolderModal,
      closeFolderModal
    }}>
      {children}
    </TargetFolderContext.Provider>
  );
}; 