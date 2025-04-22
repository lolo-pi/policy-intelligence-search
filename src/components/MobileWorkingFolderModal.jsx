import React, { useState, useCallback } from 'react';
import { useWorkingFolder } from '../context/WorkingFolderContext';
import './MobileWorkingFolderModal.css';

const MobileWorkingFolderModal = ({ onClose }) => {
  const { workingFolderDocs, removeFromWorkingFolder } = useWorkingFolder();
  const [removingIds, setRemovingIds] = useState(new Set());
  const [modalTouchStart, setModalTouchStart] = useState(null);
  const [isSwiping, setIsSwiping] = useState(false);
  const [documentTouchStart, setDocumentTouchStart] = useState(null);
  const [swipeStates, setSwipeStates] = useState({});

  const handleRemove = useCallback((docId) => {
    setRemovingIds(prev => new Set([...prev, docId]));
    setTimeout(() => {
      removeFromWorkingFolder(docId);
      setRemovingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(docId);
        return newSet;
      });
    }, 200);
  }, [removeFromWorkingFolder]);

  const handleModalTouchStart = (e) => {
    setModalTouchStart(e.touches[0].clientY);
  };

  const handleModalTouchMove = (e) => {
    if (!modalTouchStart) return;
    
    const currentTouch = e.touches[0].clientY;
    const diff = currentTouch - modalTouchStart;
    
    if (diff > 0) { // Only allow downward swipes
      setIsSwiping(true);
      const modal = e.currentTarget;
      const progress = Math.min(diff / 200, 1); // Normalize to 0-1
      modal.style.transform = `translateY(${progress * 100}%)`;
    }
  };

  const handleModalTouchEnd = (e) => {
    if (!modalTouchStart) return;
    
    const currentTouch = e.changedTouches[0].clientY;
    const diff = currentTouch - modalTouchStart;
    
    if (diff > 100) { // If swiped down more than 100px
      onClose();
    } else {
      setIsSwiping(false);
      e.currentTarget.style.transform = 'translateY(0)';
    }
    
    setModalTouchStart(null);
  };

  const handleDocumentTouchStart = (e, docId) => {
    e.stopPropagation(); // Prevent modal swipe when touching document
    setDocumentTouchStart({
      x: e.touches[0].clientX,
      docId
    });
    setSwipeStates(prev => ({
      ...prev,
      [docId]: 0
    }));
  };

  const handleDocumentTouchMove = (e, docId) => {
    e.stopPropagation(); // Prevent modal swipe when touching document
    if (!documentTouchStart || documentTouchStart.docId !== docId) return;
    
    const currentTouch = e.touches[0].clientX;
    const diff = documentTouchStart.x - currentTouch;
    
    if (diff > 0) { // Only allow left swipes
      setSwipeStates(prev => ({
        ...prev,
        [docId]: Math.min(diff, 100)
      }));
    }
  };

  const handleDocumentTouchEnd = (e, docId) => {
    e.stopPropagation(); // Prevent modal swipe when touching document
    if (!documentTouchStart || documentTouchStart.docId !== docId) return;
    
    const swipeDistance = swipeStates[docId];
    if (swipeDistance > 50) { // If swiped more than 50px
      handleRemove(docId);
    }
    
    setSwipeStates(prev => ({
      ...prev,
      [docId]: 0
    }));
    setDocumentTouchStart(null);
  };

  const getSwipeStyle = (docId) => {
    if (!swipeStates[docId]) return {};
    return {
      transform: `translateX(-${swipeStates[docId]}px)`,
      opacity: 1 - (swipeStates[docId] / 100)
    };
  };

  return (
    <div 
      className="modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div 
        className={`modal-content ${isSwiping ? 'swiping-down' : ''}`}
        onTouchStart={handleModalTouchStart}
        onTouchMove={handleModalTouchMove}
        onTouchEnd={handleModalTouchEnd}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 className="modal-title">Working Folder</h2>
        </div>
        
        <div className="documents-list">
          {workingFolderDocs.map((doc) => (
            <div 
              key={doc.id} 
              className={`document-item ${removingIds.has(doc.id) ? 'removing' : ''}`}
              onTouchStart={(e) => handleDocumentTouchStart(e, doc.id)}
              onTouchMove={(e) => handleDocumentTouchMove(e, doc.id)}
              onTouchEnd={(e) => handleDocumentTouchEnd(e, doc.id)}
              style={getSwipeStyle(doc.id)}
            >
              <div className="document-info">
                <h3 className="document-title">{doc.title}</h3>
                <p className="document-meta">
                  {doc.jurisdiction} - {doc.type}
                </p>
                {doc.s3Path && (
                  <p className="document-s3-path">
                    <span className="s3-path-label">S3:</span> {doc.s3Path}
                  </p>
                )}
              </div>
              <div className="swipe-hint">← Swipe to remove</div>
            </div>
          ))}
          {workingFolderDocs.length === 0 && (
            <p className="empty-folder-message">No documents in folder</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default MobileWorkingFolderModal; 