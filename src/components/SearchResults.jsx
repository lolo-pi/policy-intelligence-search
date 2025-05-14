// SearchResults.jsx
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useWorkingFolder } from '../context/WorkingFolderContext';
import { useSearchPage } from '../context/SearchPageContext';
import { useTargetFolder } from '../context/TargetFolderContext';
import TargetFolderIndicator from './TargetFolderIndicator';
import './SearchResults.css';
import { FOLDER_COLORS } from './FolderIconWithIndicator';
import { FolderIconWithIndicator } from './FolderIconWithIndicator';
import CreateFolderModal from './CreateFolderModal';

const SearchResults = () => {
  const { 
    workingFolderDocs, 
    addToWorkingFolder, 
    removeFromWorkingFolder, 
    createFolderRemote, 
    addToFolder,
    addToFolderRemote, 
    folders,
    loadFolders,
    removeFromFolderRemote
  } = useWorkingFolder();
  const { results, loading, error, usingMockData } = useSearchPage();
  const { targetFolderId, setTargetFolderId, promptSelectFolder, showFolderModal, closeFolderModal } = useTargetFolder();
  const [expandedDescriptions, setExpandedDescriptions] = useState({});
  const [documentStates, setDocumentStates] = useState({});
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [swipingStates, setSwipingStates] = useState({});
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const resultsAreaRef = useRef(null);
  const [pendingDocument, setPendingDocument] = useState(null);
  const [showDuplicateToast, setShowDuplicateToast] = useState(false);
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);

  // Load folders when component mounts
  useEffect(() => {
    console.log("SearchResults component mounted - loading folders");
    loadFolders();
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Reset document states when results or folder changes
  useEffect(() => {
    const newStates = {};
    results.forEach(result => {
      const docId = result.id;
      newStates[docId] = {
        inFolder: workingFolderDocs.some(doc => doc.id === docId)
      };
    });
    setDocumentStates(newStates);
  }, [results, workingFolderDocs]);

  // Test function to directly create a folder
  const testCreateFolder = async () => {
    console.log("Test creating folder directly");
    try {
      const newFolder = await createFolderRemote("Test Folder " + new Date().toISOString().substring(0, 19));
      console.log("Test folder created:", newFolder);
    } catch (error) {
      console.error("Error creating test folder:", error);
    }
  };

  // Test function to add a document to a folder
  const testAddDocToFolder = async () => {
    if (folders.length === 0 || results.length === 0) {
      console.error("Need folders and results to test adding documents");
      return;
    }

    const targetFolder = folders[0];
    const testDoc = results[0];
    
    console.log("✅✅✅ TEST: Adding document to folder ✅✅✅");
    console.log("Target folder:", targetFolder);
    console.log("Test document:", testDoc);
    
    try {
      const docToAdd = {
        id: testDoc.id,
        title: testDoc.title, 
        url: testDoc.url,
        description: testDoc.description,
        jurisdiction: testDoc.jurisdiction,
        type: testDoc.type
      };
      
      console.log("Document prepared:", docToAdd);
      const success = await addToFolderRemote(docToAdd, targetFolder.id);
      console.log("Add document result:", success ? "SUCCESS" : "FAILED");
    } catch (error) {
      console.error("Error in test add document:", error);
    }
  };

  const handleFolderAction = useCallback(async (document) => {
    const docId = document.id;
    const inFolder = workingFolderDocs.some(doc => doc.id === docId);
    
    console.log("✅✅✅ handleFolderAction called for document ✅✅✅", document);
    console.log("Document in folder:", inFolder);
    
    if (inFolder) {
      removeFromWorkingFolder(docId);
    } else {
      try {
        // Check if a target folder is selected
        if (!targetFolderId) {
          setPendingDocument(document);
          promptSelectFolder();
          return;
        }
        
        // Check if the target folder exists
        let sessionFolder = folders.find(folder => folder.id === targetFolderId);
        console.log("✅✅✅ Current folders ✅✅✅", folders);
        console.log("✅✅✅ Session folder found ✅✅✅", sessionFolder);
        
        // If the target folder is not found, log an error and return
        if (!sessionFolder) {
          console.error("✅✅✅ Target folder not found ✅✅✅");
          return;
        }
        
        // Prevent duplicate in the target folder
        if (sessionFolder.documents && sessionFolder.documents.some(doc => doc.id === docId)) {
          setShowDuplicateToast(true);
          setTimeout(() => setShowDuplicateToast(false), 2000);
          return;
        }
        
        // Add document to the folder
        const docToAdd = {
          id: docId,
          title: document.title,
          url: document.url,
          description: document.description,
          jurisdiction: document.jurisdiction,
          type: document.type
        };
        
        console.log("✅✅✅ Document to add ✅✅✅", docToAdd);
        console.log("✅✅✅ Target folder ✅✅✅", sessionFolder.id);
        
        // This will now call our updated implementation
        console.log("✅✅✅ Calling addToFolderRemote ✅✅✅");
        const result = await addToFolderRemote(docToAdd, sessionFolder.id);
        console.log("✅✅✅ addToFolderRemote result ✅✅✅", result);
        
      } catch (error) {
        console.error("✅✅✅ Error in handleFolderAction ✅✅✅", error);
        // On error, fall back to adding to working folder
        addToWorkingFolder({
          id: docId,
          title: document.title,
          url: document.url,
          description: document.description,
          jurisdiction: document.jurisdiction,
          type: document.type
        });
      }
    }
  }, [workingFolderDocs, removeFromWorkingFolder, folders, addToFolderRemote, addToWorkingFolder, targetFolderId, promptSelectFolder]);

  const handleTouchStart = (e, docId) => {
    if (!isMobile) return;
    setTouchStart({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
      docId
    });
    setTouchEnd(null);
  };

  // Refactored touchmove handler for passive: false
  useEffect(() => {
    const area = resultsAreaRef.current;
    if (!area) return;
    const handleTouchMoveWrapper = (e) => {
      if (!touchStart) return;
      // Find the card being touched
      const touch = e.targetTouches[0];
      // Find the card element
      let card = e.target;
      while (card && !card.classList.contains('result-card')) {
        card = card.parentElement;
      }
      if (!card) return;
      const docId = card.getAttribute('data-docid');
      if (!docId) return;
      // Use the same logic as before
      const xDiff = touchStart.x - touch.clientX;
      const yDiff = touchStart.y - touch.clientY;
      if (Math.abs(xDiff) > 2 * Math.abs(yDiff) && Math.abs(xDiff) > 10) {
        e.preventDefault();
        setTouchEnd({ x: touch.clientX, docId });
        setSwipingStates(prev => ({ ...prev, [docId]: xDiff }));
      } else {
        setSwipingStates({});
      }
    };
    area.addEventListener('touchmove', handleTouchMoveWrapper, { passive: false });
    return () => {
      area.removeEventListener('touchmove', handleTouchMoveWrapper);
    };
  }, [touchStart]);

  const handleTouchEnd = (doc) => {
    // Always reset swipe/touch state on touch end
    if (!isMobile || !touchStart) {
      setTouchStart(null);
      setTouchEnd(null);
      setSwipingStates({});
      return;
    }
    if (!touchEnd) {
      setTouchStart(null);
      setTouchEnd(null);
      setSwipingStates({});
      return;
    }
    const swipeDistance = touchStart.x - touchEnd.x;
    const minSwipeDistance = 100; // minimum distance for swipe

    if (Math.abs(swipeDistance) > minSwipeDistance) {
      const isInFolder = workingFolderDocs.some(wDoc => wDoc.id === doc.id);
      if (swipeDistance > 0) { // Swipe left to remove
        // Remove from the selected (target) folder if set
        if (targetFolderId) {
          const folder = folders.find(f => f.id === targetFolderId);
          if (folder && folder.documents && folder.documents.some(d => d.id === doc.id)) {
            // Remove from folder using remote API
            removeFromFolderRemote(doc.id, targetFolderId);
          }
        } else if (isInFolder) {
          // Fallback: remove from working folder
          removeFromWorkingFolder(doc.id);
        }
      } else { // Swipe right to add
        if (!isInFolder) {
          // If no folders exist, prompt to create a folder
          if (folders.length === 0) {
            setPendingDocument(doc);
            setShowCreateFolderModal(true);
            setTouchStart(null);
            setTouchEnd(null);
            setSwipingStates({});
            return;
          }
          // Check if a target folder is selected
          if (!targetFolderId) {
            setPendingDocument(doc);
            promptSelectFolder();
            return;
          }
          // Use the same logic as handleFolderAction
          handleFolderAction(doc);
        }
      }
    }
    // Always reset states
    setTouchStart(null);
    setTouchEnd(null);
    setSwipingStates({});
  };

  const getSwipeStyle = (docId) => {
    if (!isMobile || !touchStart || touchStart.docId !== docId || !swipingStates[docId]) return {};
    
    const swipeDistance = swipingStates[docId];
    const maxSwipe = 150;
    const limitedSwipe = Math.max(Math.min(swipeDistance, maxSwipe), -maxSwipe);
    const opacity = 1 - (Math.abs(limitedSwipe) / maxSwipe) * 0.3;
    
    return {
      transform: `translateX(${-limitedSwipe}px)`,
      opacity
    };
  };

  const toggleDescription = (index) => {
    setExpandedDescriptions(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  if (loading) {
    if (isMobile) {
      // On mobile, do not show the loading text below the navbar
      return null;
    }
    return (
      <div className="results-container">
        <div className="loading-spinner">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="results-container">
        <div className="error-message">
          Error loading results. Please try again.
        </div>
      </div>
    );
  }

  if (!results || results.length === 0) {
    return null;
  }

  const renderResults = () => (
    <div className="results-scroll-area" ref={resultsAreaRef}>
      {results.map((result, index) => {
        const docId = result.id;
        const inFolder = documentStates[docId]?.inFolder || false;
        // Find all folders this doc is in
        const foldersContainingDoc = folders.filter(folder => Array.isArray(folder.documents) && folder.documents.some(doc => doc.id === docId));
        
        return (
          <div 
            key={index} 
            className={`result-card ${inFolder ? 'in-folder' : ''}`}
            data-docid={docId}
            onTouchStart={(e) => handleTouchStart(e, docId)}
            onTouchEnd={() => handleTouchEnd(result)}
            style={getSwipeStyle(docId)}
          >
            {isMobile && foldersContainingDoc.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 2, position: 'absolute', top: 8, right: 8, zIndex: 2 }}>
                {foldersContainingDoc.map((folder, i) => {
                  const colorIdx = folders.findIndex(f => f.id === folder.id);
                  return (
                    <span key={folder.id} style={{
                      display: 'inline-block',
                      width: 14,
                      height: 14,
                      borderRadius: '50%',
                      background: FOLDER_COLORS[colorIdx % FOLDER_COLORS.length],
                      border: '2px solid #fff',
                      boxShadow: '0 0 0 1px #ccc',
                      marginLeft: i === 0 ? 0 : -6,
                    }} />
                  );
                })}
              </div>
            )}
            <div className="result-header">
              <h3 className="result-title">
                <a href={result.url} target="_blank" rel="noopener noreferrer">{result.title}</a>
              </h3>
              {!isMobile && (
                <button 
                  className={`add-to-folder-btn ${inFolder ? 'in-folder' : ''}`}
                  onClick={() => {
                    // DIRECT TEST: Skip handleFolderAction and test API directly
                    if (folders.length > 0) {
                      const targetFolder = folders[0]; // Use the first folder
                      const docToAdd = {
                        id: result.id,
                        title: result.title,
                        url: result.url,
                        description: result.description,
                        jurisdiction: result.jurisdiction,
                        type: result.type
                      };
                      
                      console.log("🔴🔴🔴 DIRECT TEST: Adding document to folder 🔴🔴🔴");
                      console.log("Document:", docToAdd);
                      console.log("Target folder:", targetFolder);
                      
                      // Call API directly
                      addToFolderRemote(docToAdd, targetFolder.id)
                        .then(success => {
                          console.log("🔴🔴🔴 Document add result:", success ? "SUCCESS" : "FAILED", "🔴🔴🔴");
                        })
                        .catch(error => {
                          console.error("🔴🔴🔴 Error adding document:", error, "🔴🔴🔴");
                        });
                    } else {
                      console.error("🔴🔴🔴 No folders available for testing 🔴🔴🔴");
                    }
                  }}
                >
                  {inFolder ? 'Remove' : 'Add to Folder (DIRECT TEST)'}
                </button>
              )}
            </div>
            <div className="description-container">
              <p 
                className={`result-description ${expandedDescriptions[index] ? 'expanded' : ''}`}
                onClick={() => toggleDescription(index)}
              >
                {result.description}
              </p>
            </div>
            <div className="result-footer">
              <div className="result-tags">
                <span className="tag">{result.jurisdiction}</span>
                <span className="tag">{result.type}</span>
              </div>
              {usingMockData && (
                <div className="mock-data-indicator">
                  Demo Data
                </div>
              )}
            </div>
            {isMobile && (
              null
            )}
          </div>
        );
      })}
      <TargetFolderIndicator />
    </div>
  );

  return (
    <div className="results-container">
      {isMobile && <TargetFolderIndicator />}
      <div className={`folder-picker-modal${showFolderModal ? '' : ' hidden'}`}>
        <div className="modal-content">
          <h2>Select Target Folder</h2>
          <ul>
            {folders.map((folder, idx) => (
              <li 
                key={folder.id} 
                onClick={() => {
                  setTargetFolderId(folder.id);
                  closeFolderModal();
                  setTouchStart(null);
                  setTouchEnd(null);
                  setSwipingStates({});
                  if (pendingDocument) {
                    handleFolderAction(pendingDocument);
                    setPendingDocument(null);
                  }
                }} 
                style={{ display: 'flex', alignItems: 'center', gap: 0 }}
              >
                <FolderIconWithIndicator 
                  indicatorColor={FOLDER_COLORS[idx % FOLDER_COLORS.length]} 
                  size={40} 
                  count={Array.isArray(folder.documents) ? folder.documents.length : 0} 
                  style={{ marginRight: 0 }} 
                />
                <span>{folder.name}</span>
              </li>
            ))}
          </ul>
          <button onClick={closeFolderModal}>Close</button>
        </div>
      </div>
      <CreateFolderModal
        isOpen={showCreateFolderModal}
        onClose={() => {
          setShowCreateFolderModal(false);
          setPendingDocument(null);
        }}
        onCreateFolder={async (folderName) => {
          const newFolder = await createFolderRemote(folderName);
          setShowCreateFolderModal(false);
          if (pendingDocument && newFolder && newFolder.id) {
            // Add the pending document to the new folder
            handleFolderAction({ ...pendingDocument });
            setPendingDocument(null);
          }
        }}
      />
      <div className="results-content">
        <p className="doc-count">
          {results.length} of {results.length} documents
          {usingMockData && <span className="mock-data-text"> (Demo Data)</span>}
        </p>
        {renderResults()}
      </div>
      {showDuplicateToast && (
        <div className="duplicate-toast">This document is already in the selected folder.</div>
      )}
    </div>
  );
};

export default SearchResults;
