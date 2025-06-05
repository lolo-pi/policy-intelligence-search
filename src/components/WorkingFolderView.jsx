import React, { useState, useEffect, useContext } from 'react';
import ReactDOM from 'react-dom';
import { FaTimes, FaTrash, FaFolder, FaEdit, FaCheck, FaTimes as FaTimesSmall, FaRocket } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { useWorkingFolder } from '../context/WorkingFolderContext';
import { AuthContext } from '../context/AuthContext';
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

  if (!isOpen) return null;

  const isMobileFolder = !folder;

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

    const userId = user?.username || user?.userId || 'test-user';

    // Set loading state
    setFolderIngestStatus('loading');
    setFolderIngestMessage('');

    try {
      // Debug log as requested
      console.log("📤 Ingesting folder:", folderId, "for user:", userId);

      console.log("===== FOLDER INGEST API REQUEST =====");
      console.log("User ID:", userId);
      console.log("Folder ID:", folderId);
      console.log("Original folder.folderId:", folder?.folderId);
      console.log("Original folder.id:", folder?.id);
      console.log("Documents count:", currentDocuments.length);
      console.log("=====================================");

      const response = await fetch('https://gbgi989gbe.execute-api.us-west-2.amazonaws.com/sbx/ingest-chunk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, folderId }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ API Error Response:", errorText);
        throw new Error(`Error: ${response.status} - Failed to ingest folder`);
      }

      const data = await response.json();
      console.log("✅ Folder ingest response:", data);

      // Set success state
      setFolderIngestStatus('success');
      setFolderIngestMessage('Docs ready for chat!');

    } catch (err) {
      console.error('❌ Folder ingestion error:', err);
      setFolderIngestStatus('error');
      setFolderIngestMessage(err.message || 'Ingestion failed');
    }
  };

  // Function to handle re-ingestion (with confirmation)
  const handleReIngestFolder = () => {
    if (window.confirm(`Re-ingest all documents in "${folder?.name || 'this folder'}"? This will process all documents again.`)) {
      handleIngestFolder();
    }
  };

  // Render folder ingest button based on status
  const renderFolderIngestButton = () => {
    if (isMobileFolder || !folder || currentDocuments.length === 0) {
      return null;
    }

    if (folderIngestStatus === 'loading') {
      return (
        <button
          className="folder-ingest-button loading"
          disabled={true}
          title="Ingesting all documents..."
        >
          <FaRocket className="spinning" />
          <span className="ingest-text">Ingesting...</span>
        </button>
      );
    }

    if (folderIngestStatus === 'success') {
      return (
        <button
          className="folder-ingest-button success"
          onClick={handleReIngestFolder}
          title="Documents ready for chat. Click to re-ingest."
        >
          <span className="ingest-text">✅ Docs Ready for Chat</span>
        </button>
      );
    }

    if (folderIngestStatus === 'error') {
      return (
        <button
          className="folder-ingest-button error"
          onClick={handleIngestFolder}
          title={`Error: ${folderIngestMessage}. Click to retry.`}
        >
          <span className="ingest-text">❌ Retry Ingestion</span>
        </button>
      );
    }

    // Default state - not yet ingested
    return (
      <button
        className="folder-ingest-button"
        onClick={handleIngestFolder}
        title="Prepare all documents in this folder for RAG chat"
      >
        <FaRocket />
        <span className="ingest-text">📥 Prepare for Chat</span>
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