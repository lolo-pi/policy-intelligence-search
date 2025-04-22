import React, { createContext, useContext, useState } from 'react';

const WorkingFolderContext = createContext();

export function WorkingFolderProvider({ children }) {
  const [workingFolderDocs, setWorkingFolderDocs] = useState([]);

  const addToWorkingFolder = (document) => {
    console.log('Adding document to working folder:', document);
    
    // Extract S3 path from document URL if it exists
    let s3Path = '';
    
    // Check if the URL is already an S3 path
    if (document.url && document.url.startsWith('s3://')) {
      s3Path = document.url;
      console.log('Using URL as S3 path:', s3Path);
    } 
    // If not, check if the id is an S3 path (which is the case in bedrockPOC-4.ipynb)
    else if (document.id && document.id.startsWith('s3://')) {
      s3Path = document.id;
      console.log('Using document ID as S3 path:', s3Path);
    }
    // Otherwise, document might not have an S3 path available
    else {
      console.log('No S3 path found for document:', document.id);
    }
    
    setWorkingFolderDocs(prev => {
      // Check if document already exists
      const exists = prev.some(doc => doc.id === document.id);
      if (exists) {
        console.log('Document already exists in working folder');
        return prev;
      }
      
      // Add new document with S3 path
      return [...prev, {
        ...document,
        s3Path: s3Path || '' // Store the S3 path with the document
      }];
    });
  };

  const removeFromWorkingFolder = (documentId) => {
    console.log('Removing document from working folder:', documentId);
    
    setWorkingFolderDocs(prev => 
      prev.filter(doc => doc.id !== documentId)
    );
  };

  return (
    <WorkingFolderContext.Provider 
      value={{ 
        workingFolderDocs, 
        addToWorkingFolder, 
        removeFromWorkingFolder 
      }}
    >
      {children}
    </WorkingFolderContext.Provider>
  );
}

export function useWorkingFolder() {
  const context = useContext(WorkingFolderContext);
  if (!context) {
    throw new Error('useWorkingFolder must be used within a WorkingFolderProvider');
  }
  return context;
} 