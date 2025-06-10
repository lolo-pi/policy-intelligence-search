import React, { useState, useEffect, useContext, useRef } from 'react';
import ReactDOM from 'react-dom';
import { FaTimes, FaTrash, FaFolder, FaEdit, FaCheck, FaTimes as FaTimesSmall, FaRocket } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { useWorkingFolder } from '../context/WorkingFolderContext';
import { AuthContext } from '../context/AuthContext';
import { startIngestion } from '../utils/kendraAPI';
import aiTechnologyIcon from '../assets/AI-technology.png';
import betaIcon from '../assets/Pi-CoPilot_Beta.svg';
import MobileFolderIcon from './MobileFolderIcon';
import { FolderIconWithIndicator, FOLDER_COLORS } from './FolderIconWithIndicator';
import './WorkingFolderView.css';

const WorkingFolderView = ({ isOpen, onClose, documents: initialDocuments, title, folder }) => {
  const navigate = useNavigate();
  const { removeFromWorkingFolder, renameFolder, removeFromFolder, removeFromFolderRemote, renameFolderRemote, folders } = useWorkingFolder();
  const { user } = useContext(AuthContext);
  const [editing, setEditing] = useState(false);
  const [newName, setNewName] = useState(folder?.name || '');
  const [isRemoving, setIsRemoving] = useState({});
  const [isRenaming, setIsRenaming] = useState(false);
  const [currentDocuments, setCurrentDocuments] = useState(initialDocuments || []);
  
  // State for tracking folder-level ingestion status
  const [folderIngestStatus, setFolderIngestStatus] = useState('idle'); // 'idle' | 'loading' | 'success' | 'error'
  const [folderIngestMessage, setFolderIngestMessage] = useState('');
  
  // State for tracking per-document ingestion status
  const [docIngestionStatus, setDocIngestionStatus] = useState({}); // docTitle -> boolean
  const [statusLoading, setStatusLoading] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const pollIntervalRef = useRef(null);

  // Determine if this is a mobile folder early - move this up to avoid initialization issues
  const isMobileFolder = !folder;

  // Early return if modal is not open
  if (!isOpen) return null;

  // Keep local state in sync with props
  useEffect(() => {
    setCurrentDocuments(initialDocuments || []);
  }, [initialDocuments]);

  // Keep name in sync when folder changes
  useEffect(() => {
    setNewName(folder?.name || '');
  }, [folder]);
  
  // If the folder is from context and its documents change, update our state
  useEffect(() => {
    if (folder && folder.id) {
      const updatedFolder = folders.find(f => f.id === folder.id);
      if (updatedFolder && updatedFolder.documents) {
        setCurrentDocuments(updatedFolder.documents);
      }
    }
  }, [folder, folders]);

  // Check if all documents are ingested whenever docIngestionStatus changes
  useEffect(() => {
    if (!folder || isMobileFolder || currentDocuments.length === 0) return;
    
    const allFilenames = currentDocuments.map(doc => doc.id.split('/').pop());
    const allIngested = allFilenames.every(filename => docIngestionStatus[filename] === true);
    
    if (allIngested && folderIngestStatus === 'loading') {
      console.log("🎉 All documents are now ingested!");
      setFolderIngestStatus('success');
      setFolderIngestMessage('✅ Ingestion complete!');
      setIsPolling(false); // 🔧 Stop polling
      
      // Clear the polling interval
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    }
  }, [docIngestionStatus, currentDocuments, folder, isMobileFolder, folderIngestStatus]);

  // Cleanup polling interval on unmount or folder change
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
        setIsPolling(false);
      }
    };
  }, [folder]);

  // Helper function to extract filename from document ID
  const getFilenameFromDocId = (docId) => {
    if (!docId) return '';
    return docId.split('/').pop();
  };

  // Function to get a reliable user ID with better validation
  const getUserId = () => {
    const userId = user?.username || user?.userId;
    if (!userId || userId === 'test-user') {
      console.warn('No valid user ID available:', { user, username: user?.username, userId: user?.userId });
      return null;
    }
    return userId;
  };

  // Fetch ingestion status when folder changes
  useEffect(() => {
    const fetchIngestionStatus = async () => {
      if (!folder || isMobileFolder) {
        setDocIngestionStatus({});
        return;
      }

      const folderId = folder?.folderId || folder?.id;
      if (!folderId) {
        console.warn("No folder ID available for ingestion status check");
        return;
      }

      const userId = getUserId();
      if (!userId) {
        console.warn("No valid user ID available for ingestion status check");
        setDocIngestionStatus({});
        return;
      }

      setStatusLoading(true);

      try {
        console.log("📋 Checking ingestion status for folder:", folderId, "user:", userId);

        const response = await fetch('https://gbgi989gbe.execute-api.us-west-2.amazonaws.com/sbx/get-ingestion-status', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId, folderId }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error("❌ Ingestion status API error:", errorText);
          // Don't throw - just log and continue with empty status
          setDocIngestionStatus({});
          return;
        }

        const data = await response.json();
        console.log("✅ Ingestion status response:", data);

        if (data.doc_status) {
          setDocIngestionStatus(data.doc_status);
        } else {
          console.warn("Unexpected ingestion status response format:", data);
          setDocIngestionStatus({});
        }

      } catch (err) {
        console.error('❌ Failed to fetch ingestion status:', err);
        setDocIngestionStatus({});
      } finally {
        setStatusLoading(false);
      }
    };

    fetchIngestionStatus();
  }, [folder, user, isMobileFolder]); // Re-fetch when folder or user changes

  const handleRemove = async (docId) => {
    if (docId) {
      // Set removing state for this document
      setIsRemoving(prev => ({ ...prev, [docId]: true }));
      
      try {
        if (isMobileFolder) {
          // Handle mobile folder (local only)
          removeFromWorkingFolder(docId);
          // Update local state immediately
          setCurrentDocuments(prev => prev.filter(doc => doc.id !== docId));
        } else if (folder?.id) {
          // For regular folders, use the remote API
          console.log("🟣🟣🟣 Removing document from folder 🟣🟣🟣");
          console.log("Document ID:", docId);
          console.log("Folder ID:", folder.id);
          
          const success = await removeFromFolderRemote(docId, folder.id);
          console.log("🟣🟣🟣 Document removal result:", success ? "SUCCESS" : "FAILED", "🟣🟣🟣");
          
          // Update local state immediately regardless of API success
          setCurrentDocuments(prev => prev.filter(doc => doc.id !== docId));
        }
      } catch (error) {
        console.error("Error removing document from folder:", error);
      } finally {
        // Clear removing state
        setIsRemoving(prev => ({ ...prev, [docId]: false }));
      }
    }
  };

  const handleRename = async () => {
    if (folder && newName.trim() && newName !== folder.name) {
      setIsRenaming(true);
      
      try {
        console.log("🔵🔵🔵 Renaming folder 🔵🔵🔵");
        console.log("Folder ID:", folder.id);
        console.log("New name:", newName.trim());
        
        const success = await renameFolderRemote(folder.id, newName.trim());
        console.log("🔵🔵🔵 Folder rename result:", success ? "SUCCESS" : "FAILED", "🔵🔵🔵");
        
        // Note: renameFolderRemote already calls renameFolder internally
      } catch (error) {
        console.error("Error renaming folder:", error);
      } finally {
        setIsRenaming(false);
        setEditing(false);
      }
    } else {
      // Just close the editing UI if there's no change
      setEditing(false);
    }
  };

  // Function to handle folder-level ingestion
  const handleIngestFolder = async () => {
    // Use folderId if available, otherwise use id as fallback
    const folderId = folder?.folderId || folder?.id;
    
    if (!folderId) {
      alert('Cannot ingest: folder is missing ID');
      return;
    }

    if (currentDocuments.length === 0) {
      alert('Cannot ingest: folder contains no documents');
      return;
    }

    const userId = getUserId();
    if (!userId) {
      alert('Cannot ingest: user is not properly authenticated. Please refresh the page and try again.');
      return;
    }

    // Set loading state
    setFolderIngestStatus('loading');
    setFolderIngestMessage('');

    console.log("📤 Triggering folder ingestion:", folderId, "for user:", userId);

    try {
      // Call the new start ingestion API
      const result = await startIngestion(userId, folderId);

      if (result.success) {
        // Success case (including 503 warnings)
        console.log("✅ Ingestion started successfully:", result.data);
        
        setFolderIngestStatus('success');
        if (result.warning) {
          setFolderIngestMessage(`Ingestion started (${result.warning})`);
        } else {
          setFolderIngestMessage('Ingestion started successfully!');
        }

      } else {
        // Error case
        console.error("❌ Ingestion failed:", result.error);
        setFolderIngestStatus('error');
        setFolderIngestMessage(result.error || 'Failed to start ingestion');
      }

    } catch (err) {
      // Unexpected error (shouldn't happen since startIngestion handles all errors)
      console.error('❌ Unexpected error in handleIngestFolder:', err);
      setFolderIngestStatus('error');
      setFolderIngestMessage('Unexpected error occurred');
    } finally {
      // Always start polling for ingestion status, regardless of success/failure
      console.log("🔄 Starting ingestion status polling (every 15 seconds for up to 10 minutes)...");
      
      setIsPolling(true); // 🔧 Start polling
      pollIngestionStatus(userId, folderId, currentDocuments);
    }
  };

  // Function to refresh ingestion status
  const refreshIngestionStatus = async () => {
    if (!folder || isMobileFolder) return;

    const folderId = folder?.folderId || folder?.id;
    if (!folderId) return;

    const userId = getUserId();
    if (!userId) {
      console.warn("No valid user ID available for refreshing ingestion status");
      return;
    }

    try {
      console.log("🔄 Refreshing ingestion status...");

      const response = await fetch('https://gbgi989gbe.execute-api.us-west-2.amazonaws.com/sbx/get-ingestion-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, folderId }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.doc_status) {
          setDocIngestionStatus(data.doc_status);
          console.log("✅ Ingestion status refreshed:", data.doc_status);
        }
      }
    } catch (err) {
      console.warn('Failed to refresh ingestion status:', err);
    }
  };

  // Function to poll ingestion status until all documents are ingested or timeout
  const pollIngestionStatus = async (userId, folderId, documentsToCheck) => {
    // Validate that we still have a valid user ID for polling
    const currentUserId = getUserId();
    if (!currentUserId) {
      console.warn("⚠️ No valid user ID available for polling, stopping...");
      setFolderIngestStatus('error');
      setFolderIngestMessage('User authentication lost during polling. Please refresh the page.');
      return;
    }

    // Use the current user ID instead of the passed one in case it has changed
    const validUserId = currentUserId;
    
    const maxAttempts = 60; // 15 minutes at 15 second intervals
    let attempts = 0;
    
    // Clear any existing polling interval
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }
    
    pollIntervalRef.current = setInterval(async () => {
      attempts++;
      console.log(`🔄 Polling ingestion status (attempt ${attempts}/${maxAttempts})...`);
      
      try {
        const response = await fetch('https://gbgi989gbe.execute-api.us-west-2.amazonaws.com/sbx/get-ingestion-status', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId: validUserId, folderId }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.doc_status) {
            setDocIngestionStatus(data.doc_status);
            console.log(`✅ Ingestion status updated (attempt ${attempts}):`, data.doc_status);
            
            // Check if all documents are ingested using filename extraction
            const allIngested = documentsToCheck.every(doc => {
              const filename = getFilenameFromDocId(doc.id);
              return data.doc_status[filename] === true;
            });
            
            if (allIngested) {
              console.log("🎉 All documents are now ingested! Stopping polling.");
              clearInterval(pollIntervalRef.current);
              pollIntervalRef.current = null;
              return;
            }
          }
        } else {
          console.warn(`⚠️ Polling attempt ${attempts} failed with status ${response.status}`);
        }
      } catch (err) {
        console.warn(`⚠️ Polling attempt ${attempts} failed:`, err);
      }
      
      // Check if we've reached the maximum attempts
      if (attempts >= maxAttempts) {
        console.warn("⏳ Polling timeout reached (15 minutes). Ingestion may still be in progress.");
        setFolderIngestStatus('error');
        setFolderIngestMessage('Ingestion timeout (15 minutes). Some documents may still be processing.');
        setIsPolling(false); // 🔧 Stop polling on timeout
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    }, 15000); // 15 seconds
  };

  // Function to render document ingestion status
  const renderDocumentIngestionStatus = (doc) => {
    const filename = getFilenameFromDocId(doc.id);
    
    // Debug logging for key matching
    console.log("🔍 Checking ingestion status:");
    console.log("doc.id:", doc.id);
    console.log("extracted filename:", filename);
    console.log("Available status keys:", Object.keys(docIngestionStatus));
    console.log("Status match:", docIngestionStatus[filename]);
    
    if (statusLoading) {
      return (
        <span className="doc-ingestion-status loading" title="Checking ingestion status...">
          ⏳ Loading...
        </span>
      );
    }

    const isIngested = docIngestionStatus[filename];
    
    // Log if document filename results in undefined
    if (isIngested === undefined) {
      console.log("⚠️ Filename resulted in undefined status:", filename);
    }
    
    if (isIngested === true) {
      return (
        <span className="doc-ingestion-status ingested" title="Document is ingested and ready for chat">
          ✅ Ready
        </span>
      );
    }
    
    if (isIngested === false) {
      return (
        <span className="doc-ingestion-status not-ingested" title="Document not yet ingested">
          ❌ Not Ready
        </span>
      );
    }
    
    // undefined status - show nothing or a neutral indicator
    return (
      <span className="doc-ingestion-status unknown" title="Ingestion status unknown">
        ❓ Unknown
      </span>
    );
  };

  // Function to handle re-starting ingestion (with confirmation)
  const handleReIngestFolder = () => {
    if (window.confirm(`Restart ingestion for all documents in "${folder?.name || 'this folder'}"? This will start the ingestion process again.`)) {
      handleIngestFolder();
    }
  };

  // Render folder ingest button based on status
  const renderFolderIngestButton = () => {
    if (isMobileFolder || !folder || currentDocuments.length === 0) {
      return null;
    }

    // Check if we have a valid user ID
    const hasValidUser = getUserId() !== null;

    if (folderIngestStatus === 'loading') {
      return (
        <button
          className="folder-ingest-button loading"
          disabled={true}
          title="Starting ingestion process..."
        >
          <FaRocket className="spinning" />
          <span className="ingest-text">⏳ Starting Ingestion...</span>
        </button>
      );
    }

    if (folderIngestStatus === 'success') {
      return (
        <button
          className="folder-ingest-button success"
          onClick={handleReIngestFolder}
          disabled={!hasValidUser}
          title={!hasValidUser 
            ? "Please refresh the page to authenticate properly before restarting ingestion."
            : folderIngestMessage.includes('Ingestion complete') 
              ? "All documents are ready for chat! Click to restart ingestion if needed." 
              : "Ingestion started successfully. Click to restart ingestion."}
        >
          <span className="ingest-text">
            {folderIngestMessage.includes('Ingestion complete') 
              ? '✅ All Ready for Chat!' 
              : '✅ Ingestion Started!'}
          </span>
        </button>
      );
    }

    if (folderIngestStatus === 'error') {
      return (
        <button
          className="folder-ingest-button error"
          onClick={handleIngestFolder}
          disabled={!hasValidUser}
          title={!hasValidUser 
            ? "Please refresh the page to authenticate properly before starting ingestion."
            : `Error: ${folderIngestMessage}. Click to retry.`}
        >
          <span className="ingest-text">❌ Start Ingestion</span>
        </button>
      );
    }

    // Default state - not yet started
    return (
      <button
        className="folder-ingest-button"
        onClick={handleIngestFolder}
        disabled={!hasValidUser}
        title={!hasValidUser 
          ? "Please refresh the page to authenticate properly before starting ingestion."
          : "Start ingestion process for all documents in this folder"}
      >
        <FaRocket />
        <span className="ingest-text">
          {!hasValidUser ? '🔄 Authentication Required' : '🚀 Start Ingestion'}
        </span>
      </button>
    );
  };

  // Render modal and overlay in a portal
  const modalContent = (
    <div className="working-folder-overlay">
      <div className="working-folder-modal">
        <div className="working-folder-header" style={{ marginBottom: 0, display: 'flex', alignItems: 'center', padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', flex: 1, justifyContent: 'space-between' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 2, margin: 0 }}>
              {(() => {
                const idx = folders.findIndex(f => f.id === folder?.id);
                const indicatorColor = FOLDER_COLORS[idx >= 0 ? idx % FOLDER_COLORS.length : 1];
                return (
                  <FolderIconWithIndicator
                    indicatorColor={indicatorColor}
                    size={54}
                    count={currentDocuments ? currentDocuments.length : 0}
                  />
                );
              })()}
              <span className={`editable-folder-name-area${editing ? ' editing' : ''}`}
                style={{ display: 'flex', alignItems: 'center', gap: 8, position: 'relative', marginLeft: 0, paddingLeft: 0, flexWrap: 'nowrap', maxWidth: '100%' }}>
                {editing ? (
                  <>
                    <input
                      type="text"
                      value={newName}
                      onChange={e => setNewName(e.target.value)}
                      style={{ fontSize: 20, fontWeight: 600, padding: '2px 8px', borderRadius: 6, border: '1.5px solid #bcd0e5', minWidth: 120, color: '#274C77', background: '#f7fafc', outline: 'none', maxWidth: 220, flex: '1 1 0', marginRight: 0 }}
                      autoFocus
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleRename();
                        if (e.key === 'Escape') setEditing(false);
                      }}
                      disabled={isRenaming}
                    />
                  </>
                ) : (
                  <>
                    <span style={{ color: '#274C77', fontWeight: 600, fontSize: 20 }}>{folder?.name || title || 'Working Folder Contents'}</span>
                    <button
                      onClick={() => { setNewName(folder?.name || ''); setEditing(true); }}
                      title="Rename folder"
                      className="rename-pencil-btn"
                      style={{ marginLeft: 4 }}
                    >
                      <FaEdit />
                    </button>
                  </>
                )}
              </span>
            </h3>
            {editing && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 24 }}>
                <button
                  onClick={handleRename}
                  title="Save"
                  className="rename-action-btn save-btn"
                  disabled={isRenaming}
                >
                  {isRenaming ? (
                    <span className="spinner-sm"></span>
                  ) : (
                    <FaCheck />
                  )}
                </button>
                <button
                  onClick={() => setEditing(false)}
                  title="Cancel"
                  className="rename-action-btn cancel-btn"
                  disabled={isRenaming}
                >
                  <FaTimesSmall />
                </button>
              </span>
            )}
          </div>
          <button className="close-button" onClick={onClose} style={{ marginLeft: 12 }}>
            <FaTimes />
          </button>
        </div>
        <div className="working-folder-content">
          {/* DEBUG LOGGING */}
          {console.log("===== FOLDER DEBUG INFO =====")}
          {console.log("Folder object:", folder)}
          {console.log("isMobileFolder:", isMobileFolder)}
          {console.log("folder?.id:", folder?.id)}
          {console.log("folder?.folderId:", folder?.folderId)}
          {console.log("currentDocuments:", currentDocuments)}
          {console.log("currentDocuments.length:", currentDocuments.length)}
          {console.log("folderIngestStatus:", folderIngestStatus)}
          {console.log("folderIngestMessage:", folderIngestMessage)}
          {console.log("docIngestionStatus:", docIngestionStatus)}
          {console.log("statusLoading:", statusLoading)}
          {console.log("API Flow: Using /ingest-chunks endpoint")}
          {console.log("===============================")}
          
          {/* Folder-level ingest button */}
          {renderFolderIngestButton() && (
            <div className="folder-ingest-section">
              {renderFolderIngestButton()}
              {folderIngestMessage && (
                <div className={`ingest-message ${folderIngestStatus}`}>
                  {folderIngestMessage}
                </div>
              )}
            </div>
          )}
          
          {currentDocuments.length === 0 ? (
            <p className="empty-message">No documents in {isMobileFolder ? 'Mobile Folder' : 'working folder'}</p>
          ) : (
            <ul className="document-list">
              {currentDocuments.map((doc) => (
                <li key={doc.id} className="document-item">
                  <div className="document-info">
                    {doc.url ? (
                      <a
                        className="document-title clickable"
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {doc.title}
                      </a>
                    ) : (
                      <span
                        className="document-title clickable"
                        onClick={() => console.log('Clicked document:', doc.id, doc.title)}
                      >
                        {doc.title}
                      </span>
                    )}
                    <span className="document-description">{doc.description}</span>
                    <div className="document-meta">
                      <span className="document-jurisdiction">{doc.jurisdiction}</span>
                      {renderDocumentIngestionStatus(doc)}
                    </div>
                  </div>
                  <div className="document-actions">
                    <button
                      className="remove-doc-button"
                      onClick={() => handleRemove(doc.id)}
                      title="Remove from Folder"
                      disabled={isRemoving[doc.id]}
                    >
                      {isRemoving[doc.id] ? (
                        <span className="spinner-sm"></span>
                      ) : (
                        <FaTrash />
                      )}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalContent, document.body);
};

export default WorkingFolderView; 