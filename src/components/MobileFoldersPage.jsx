import React, { useState } from 'react';
import { useWorkingFolder } from '../context/WorkingFolderContext';
import { FaTrash, FaPlus, FaChevronDown, FaChevronUp, FaEdit, FaCheck, FaTimes, FaEye, FaChevronRight } from 'react-icons/fa';
import { FolderIconWithIndicator, FOLDER_COLORS } from './FolderIconWithIndicator';
import './MobileLayout.css';
import WorkingFolderView from './WorkingFolderView';

const MobileFoldersPage = ({ isOpen, onClose }) => {
  const { folders, createFolder, deleteFolder, deleteFolderRemote, renameFolder, removeFromFolder } = useWorkingFolder();
  const [expandedFolderIds, setExpandedFolderIds] = useState([]);
  const [showCreateInput, setShowCreateInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [renamingFolderId, setRenamingFolderId] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [viewingFolder, setViewingFolder] = useState(null);
  const [isDeleting, setIsDeleting] = useState(null);

  if (!isOpen) return null;

  const handleCreateFolder = () => {
    if (newFolderName.trim()) {
      createFolder(newFolderName.trim());
      setNewFolderName('');
      setShowCreateInput(false);
    }
  };

  const handleRenameFolder = (folderId) => {
    if (renameValue.trim()) {
      renameFolder(folderId, renameValue.trim());
      setRenamingFolderId(null);
      setRenameValue('');
    }
  };

  const handleDeleteFolder = async (folderId) => {
    if (window.confirm('Are you sure you want to delete this folder?')) {
      setIsDeleting(folderId);
      
      try {
        console.log("Deleting folder from backend:", folderId);
        // First call the backend API to delete from DynamoDB
        const success = await deleteFolderRemote(folderId);
        
        if (success) {
          console.log("Folder deleted successfully from DynamoDB");
          // deleteFolder is already called inside deleteFolderRemote to update local state
        } else {
          console.warn("Backend deletion failed, falling back to local-only deletion");
          // If the backend call failed, still update local state
          deleteFolder(folderId);
        }
      } catch (error) {
        console.error("Error deleting folder:", error);
        // Fall back to local state update in case of error
        deleteFolder(folderId);
      } finally {
        setIsDeleting(null);
      }
    }
  };

  return (
    <div className="mobile-folders-page" style={{
      position: 'fixed',
      top: 64,
      left: 0,
      right: 0,
      bottom: 0,
      background: '#f8f9fa',
      zIndex: 999,
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Nav-style button row */}
      <div style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        background: '#f8f9fa',
        borderBottom: '1px solid #eee',
        padding: '10px 14px 8px 14px',
        minHeight: 40,
      }}>
        <button
          onClick={() => setShowCreateInput((v) => !v)}
          aria-label="Create folder"
          style={{
            width: 32,
            height: 32,
            background: '#274C77',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20,
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'background 0.2s',
            WebkitTapHighlightColor: 'transparent',
            outline: 'none',
          }}
          onMouseOver={e => e.currentTarget.style.background = '#1d3857'}
          onMouseOut={e => e.currentTarget.style.background = '#274C77'}
        >
          +
        </button>
      </div>
      <div style={{ padding: '18px', flex: 1, overflowY: 'auto', background: '#f8f9fa' }}>
        {showCreateInput && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: 16,
            borderRadius: 8,
            border: '1.5px solid #e0e6ed',
            padding: '4px 8px 4px 12px',
            gap: 18,
            background: 'transparent',
            boxShadow: 'none',
          }}>
            <input
              type="text"
              value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
              placeholder="New folder name..."
              style={{
                flex: 1,
                border: 'none',
                outline: 'none',
                background: 'transparent',
                fontSize: 16,
                color: '#274C77',
                padding: '8px 0',
                fontWeight: 500,
                letterSpacing: 0.1,
              }}
              autoFocus
              onFocus={e => e.target.parentNode.style.boxShadow = '0 2px 12px rgba(69,123,157,0.10)'}
              onBlur={e => e.target.parentNode.style.boxShadow = '0 1.5px 6px rgba(39,76,119,0.06)'}
              onKeyDown={e => { if (e.key === 'Enter') handleCreateFolder(); if (e.key === 'Escape') setShowCreateInput(false); }}
            />
            <button
              onClick={handleCreateFolder}
              style={{
                background: 'none',
                border: 'none',
                color: '#218838',
                fontSize: 22,
                cursor: 'pointer',
                WebkitTapHighlightColor: 'transparent',
                outline: 'none',
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              aria-label="Create folder"
            >
              <FaCheck />
            </button>
            <button
              onClick={() => setShowCreateInput(false)}
              style={{
                background: 'none',
                border: 'none',
                color: '#b0b8c1',
                fontSize: 22,
                cursor: 'pointer',
                WebkitTapHighlightColor: 'transparent',
                outline: 'none',
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              aria-label="Cancel create folder"
            >
              <FaTimes />
            </button>
          </div>
        )}
        {folders && folders.length > 0 ? (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {folders.map((folder, idx) => (
              <li key={folder.id} style={{
                background: '#dbeafe', // blue-100
                borderRadius: 8,
                marginBottom: 10,
                boxShadow: '0 1px 4px rgba(39,76,119,0.04)',
                padding: 0,
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '6px 10px 4px 10px',
                }}>
                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', width: '100%', WebkitTapHighlightColor: 'transparent', outline: 'none' }}
                    onClick={() => {
                      setExpandedFolderIds(prev =>
                        prev.includes(folder.id)
                          ? prev.filter(id => id !== folder.id)
                          : [...prev, folder.id]
                      );
                    }}
                  >
                    {/* Chevron indicator for expand/collapse */}
                    {expandedFolderIds.includes(folder.id) ? (
                      <FaChevronDown style={{ color: '#b6c6e3', fontSize: '16px', marginRight: 2 }} />
                    ) : (
                      <FaChevronRight style={{ color: '#b6c6e3', fontSize: '16px', marginRight: 2 }} />
                    )}
                    <FolderIconWithIndicator indicatorColor={FOLDER_COLORS[idx % FOLDER_COLORS.length]} size={48} count={folder.documents?.length || 0} />
                    <span style={{ fontWeight: 500, fontSize: 19, marginLeft: 0 }}>{folder.name}</span>
                  </div>
                  {expandedFolderIds.includes(folder.id) && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                      <FaEye style={{ color: '#274C77', fontSize: 18, opacity: 0.7, cursor: 'pointer' }} onClick={() => setViewingFolder(folder)} />
                      <button 
                        onClick={() => handleDeleteFolder(folder.id)} 
                        style={{ 
                          background: 'none', 
                          border: 'none', 
                          color: isDeleting === folder.id ? '#ccc' : '#999', 
                          fontSize: 18, 
                          cursor: isDeleting === folder.id ? 'default' : 'pointer', 
                          padding: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }} 
                        onMouseOver={e => e.currentTarget.style.color = isDeleting === folder.id ? '#ccc' : '#d32f2f'} 
                        onMouseOut={e => e.currentTarget.style.color = isDeleting === folder.id ? '#ccc' : '#999'}
                        disabled={isDeleting === folder.id}
                      >
                        {isDeleting === folder.id ? (
                          <span className="spinner-sm" style={{ width: 16, height: 16, border: '2px solid #ccc', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 1s linear infinite' }}></span>
                        ) : (
                          <FaTrash />
                        )}
                      </button>
                    </div>
                  )}
                </div>
                {expandedFolderIds.includes(folder.id) && folder.documents && folder.documents.length > 0 && (
                  <ul style={{ listStyle: 'none', padding: '0 0 0 0', margin: 0, background: '#e8f0fe', borderRadius: '0 0 8px 8px' }}>
                    {folder.documents.map((doc, docIdx) => (
                      <li key={doc.id} style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '14px 16px',
                        borderBottom: docIdx !== folder.documents.length - 1 ? '1px solid #dbeafe' : 'none',
                        fontSize: 15,
                        color: '#274C77'
                      }}>
                        <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{doc.title}</span>
                        <button onClick={() => {
                          if (window.confirm('Are you sure you want to remove this document from the folder?')) {
                            removeFromFolder(doc.id, folder.id);
                          }
                        }} style={{ background: 'none', border: 'none', color: '#999', fontSize: 16, cursor: 'pointer', marginLeft: 8, padding: 0 }} onMouseOver={e => e.currentTarget.style.color = '#d32f2f'} onMouseOut={e => e.currentTarget.style.color = '#999'}><FaTrash /></button>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <div style={{ color: '#888', textAlign: 'center', marginTop: 40 }}>No folders found.</div>
        )}
        {/* WorkingFolderView modal for folder view */}
        <WorkingFolderView
          isOpen={!!viewingFolder}
          onClose={() => setViewingFolder(null)}
          documents={folders.find(f => f.id === viewingFolder?.id)?.documents || []}
          title={folders.find(f => f.id === viewingFolder?.id)?.name || viewingFolder?.name}
          folder={folders.find(f => f.id === viewingFolder?.id) || viewingFolder}
        />
      </div>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default MobileFoldersPage; 