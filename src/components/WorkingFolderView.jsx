import React from 'react';
import ReactDOM from 'react-dom';
import { FaTimes, FaTrash, FaFolder, FaEdit, FaCheck, FaTimes as FaTimesSmall } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { useWorkingFolder } from '../context/WorkingFolderContext';
import aiTechnologyIcon from '../assets/AI-technology.png';
import betaIcon from '../assets/Pi-CoPilot_Beta.svg';
import MobileFolderIcon from './MobileFolderIcon';
import { FolderIconWithIndicator, FOLDER_COLORS } from './FolderIconWithIndicator';
import './WorkingFolderView.css';

const WorkingFolderView = ({ isOpen, onClose, documents, title, folder }) => {
  const navigate = useNavigate();
  const { removeFromWorkingFolder, renameFolder, removeFromFolder, removeFromFolderRemote, renameFolderRemote, folders } = useWorkingFolder();
  const [editing, setEditing] = React.useState(false);
  const [newName, setNewName] = React.useState(folder?.name || '');
  const [isRemoving, setIsRemoving] = React.useState({});
  const [isRenaming, setIsRenaming] = React.useState(false);

  React.useEffect(() => {
    setNewName(folder?.name || '');
  }, [folder]);

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
        } else if (folder?.id) {
          // For regular folders, use the remote API
          console.log("🟣🟣🟣 Removing document from folder 🟣🟣🟣");
          console.log("Document ID:", docId);
          console.log("Folder ID:", folder.id);
          
          const success = await removeFromFolderRemote(docId, folder.id);
          console.log("🟣🟣🟣 Document removal result:", success ? "SUCCESS" : "FAILED", "🟣🟣🟣");
          
          // Note: removeFromFolderRemote already calls removeFromFolder internally
          // so we don't need to call it again here
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
                    count={folder && folder.documents ? folder.documents.length : 0}
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
          {documents.length === 0 ? (
            <p className="empty-message">No documents in {isMobileFolder ? 'Mobile Folder' : 'working folder'}</p>
          ) : (
            <ul className="document-list">
              {documents.map((doc) => (
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