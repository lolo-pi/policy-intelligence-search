// SearchResults.jsx
import React, { useState, useCallback, useEffect } from 'react';
import { useWorkingFolder } from '../context/WorkingFolderContext';
import { useSearchPage } from '../context/SearchPageContext';
import './SearchResults.css';

const SearchResults = () => {
  const { workingFolderDocs, addToWorkingFolder, removeFromWorkingFolder } = useWorkingFolder();
  const { results, loading, error, usingMockData } = useSearchPage();
  const [expandedDescriptions, setExpandedDescriptions] = useState({});
  const [documentStates, setDocumentStates] = useState({});
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [swipingStates, setSwipingStates] = useState({});
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

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

  const handleFolderAction = useCallback((document) => {
    const docId = document.id;
    const inFolder = workingFolderDocs.some(doc => doc.id === docId);
    
    if (inFolder) {
      removeFromWorkingFolder(docId);
    } else {
      // Extract S3 URI from document if available
      const s3Path = document.url && document.url.startsWith('s3://') ? 
                     document.url : 
                     (document.id && document.id.startsWith('s3://') ? document.id : '');
      
      addToWorkingFolder({
        id: docId,
        title: document.title,
        url: document.url || '',
        description: document.description,
        jurisdiction: document.jurisdiction,
        type: document.type,
        s3Path: s3Path // Explicitly pass s3Path
      });
    }
  }, [workingFolderDocs, addToWorkingFolder, removeFromWorkingFolder]);

  const handleTouchStart = (e, docId) => {
    if (!isMobile) return;
    setTouchStart({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
      docId
    });
    setTouchEnd(null);
  };

  const handleTouchMove = (e, docId) => {
    if (!isMobile || !touchStart) return;
    
    const xDiff = touchStart.x - e.targetTouches[0].clientX;
    const yDiff = touchStart.y - e.targetTouches[0].clientY;
    
    // If vertical scrolling is dominant, don't trigger swipe
    if (Math.abs(yDiff) > Math.abs(xDiff)) {
      setSwipingStates({});
      return;
    }

    // Only trigger swipe if horizontal movement is significant
    if (Math.abs(xDiff) > 10) {
      setTouchEnd({
        x: e.targetTouches[0].clientX,
        docId
      });

      setSwipingStates(prev => ({
        ...prev,
        [docId]: xDiff
      }));
    }
  };

  const handleTouchEnd = (doc) => {
    if (!isMobile || !touchStart || !touchEnd) return;
    
    const swipeDistance = touchStart.x - touchEnd.x;
    const minSwipeDistance = 100; // minimum distance for swipe

    if (Math.abs(swipeDistance) > minSwipeDistance) {
      const isInFolder = workingFolderDocs.some(wDoc => wDoc.id === doc.id);
      
      if (swipeDistance > 0) { // Swipe left to remove
        if (isInFolder) {
          removeFromWorkingFolder(doc.id);
        }
      } else { // Swipe right to add
        if (!isInFolder) {
          // Extract S3 URI from document if available
          const s3Path = doc.url && doc.url.startsWith('s3://') ? 
                        doc.url : 
                        (doc.id && doc.id.startsWith('s3://') ? doc.id : '');
          
          addToWorkingFolder({
            id: doc.id,
            title: doc.title,
            url: doc.url || '',
            description: doc.description,
            jurisdiction: doc.jurisdiction,
            type: doc.type,
            s3Path: s3Path // Explicitly pass s3Path
          });
        }
      }
    }

    // Reset states
    setTouchStart(null);
    setTouchEnd(null);
    setSwipingStates(prev => ({
      ...prev,
      [doc.id]: 0
    }));
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
    <div className="results-scroll-area">
      {results.map((result, index) => {
        const docId = result.id;
        const inFolder = documentStates[docId]?.inFolder || false;
        
        return (
          <div 
            key={index} 
            className={`result-card ${inFolder ? 'in-folder' : ''}`}
            onTouchStart={(e) => handleTouchStart(e, docId)}
            onTouchMove={(e) => handleTouchMove(e, docId)}
            onTouchEnd={() => handleTouchEnd(result)}
            style={getSwipeStyle(docId)}
          >
            {isMobile && <div className="folder-indicator" />}
            <div className="result-header">
              <h3 className="result-title">
                <a href={result.url} target="_blank" rel="noopener noreferrer">{result.title}</a>
              </h3>
              {!isMobile && (
                <button 
                  className={`add-to-folder-btn ${inFolder ? 'in-folder' : ''}`}
                  onClick={() => handleFolderAction(result)}
                >
                  {inFolder ? 'Remove' : 'Add to Folder'}
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
              <div className="swipe-hint">
                {inFolder ? '← Swipe left to remove' : '→ Swipe right to add'}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="results-container">
      <div className="results-content">
        <p className="doc-count">
          {results.length} of {results.length} documents
          {usingMockData && <span className="mock-data-text"> (Demo Data)</span>}
        </p>
        {renderResults()}
      </div>
    </div>
  );
};

export default SearchResults;
