import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useSearchPage } from '../context/SearchPageContext';
import { useWorkingFolder } from '../context/WorkingFolderContext';
import { FaFolderPlus, FaFolderMinus, FaThLarge, FaList, FaGlobe, FaChevronDown, FaChevronLeft, FaChevronRight, FaChevronUp } from 'react-icons/fa';
import CreateNewFolderIcon from '@mui/icons-material/CreateNewFolder';
import searchIcon from '../assets/Search-Icon.png';
import './DynamicSearch.css';
import CreateFolderModal from './CreateFolderModal';

const DynamicSearch = () => {
  const { handleSearch, results, loading, error, searchQuery, setSearchQuery } = useSearchPage();
  const { workingFolderDocs, addToWorkingFolder, removeFromWorkingFolder, folders, moveToFolder, createFolder, addToFolder, addToFolderRemote } = useWorkingFolder();
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState('folder'); // 'folder' (list), 'grid', or 'jurisdiction'
  const [searchInitiated, setSearchInitiated] = useState(false);
  const [expandedJurisdictions, setExpandedJurisdictions] = useState(new Set());
  const resultsPerPage = 25; // Show 25 results per page, for a smoother experience
  const maxResults = 100; // Maximum results to display
  const [dropdownOpenIndex, setDropdownOpenIndex] = useState(null);
  const [addToFolderDropdownId, setAddToFolderDropdownId] = useState(null);
  const [addToFolderDropdownCoords, setAddToFolderDropdownCoords] = useState({ top: 0, left: 0 });
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [pendingAddToFolderDoc, setPendingAddToFolderDoc] = useState(null);
  
  const suggestedSearches = [
    'NOx reduction',
    'HDV regulations',
    'Landfills',
    'Refinery'
  ];
  
  // Reset pagination when search results change
  useEffect(() => {
    setCurrentPage(1);
  }, [results]);
  
  const handleSubmit = (e) => {
    e.preventDefault();
    setSearchInitiated(true);
    handleSearch(searchQuery);
  };
  
  // Add effect to handle loading state
  useEffect(() => {
    if (loading) {
      setSearchInitiated(true);
    }
  }, [loading]);

  // Add effect to handle results
  useEffect(() => {
    if (results.length > 0) {
      setSearchInitiated(true);
    }
  }, [results]);
  
  const handleSuggestedSearch = (suggestion) => {
    setSearchQuery(suggestion);
    setSearchInitiated(true);
    handleSearch(suggestion);
  };
  
  // Calculate current results for pagination
  const indexOfLastResult = currentPage * resultsPerPage;
  const indexOfFirstResult = indexOfLastResult - resultsPerPage;
  const currentResults = results.slice(0, maxResults).slice(indexOfFirstResult, indexOfLastResult);
  const totalPages = Math.ceil(Math.min(results.length, maxResults) / resultsPerPage);
  
  // Change page
  const paginate = (pageNumber) => setCurrentPage(pageNumber);
  
  // Create an array of available page numbers
  const pageNumbers = [];
  for (let i = 1; i <= totalPages; i++) {
    pageNumbers.push(i);
  }
  
  // Handle next and previous page navigation
  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };
  
  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  // Helper function to get document type safely - handles different property names
  const getDocumentType = (result) => {
    // Try different possible property names for document type
    return result.type || result.documentType || result.DocumentType || 'Unknown';
  };

  // Check if a document is in the working folder
  const isInWorkingFolder = (doc) => {
    return workingFolderDocs.some(workingDoc => 
      workingDoc.id === doc.id ||
      workingDoc.url === doc.url || 
      workingDoc.title === doc.title
    );
  };
  
  // Group results by jurisdiction
  const groupedResults = currentResults.reduce((acc, result) => {
    const jurisdiction = result.jurisdiction || 'Other';
    if (!acc[jurisdiction]) {
      acc[jurisdiction] = [];
    }
    acc[jurisdiction].push(result);
    return acc;
  }, {});

  // Sort jurisdictions alphabetically
  const sortedJurisdictions = Object.keys(groupedResults).sort();
  
  const toggleJurisdiction = (jurisdiction) => {
    setExpandedJurisdictions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(jurisdiction)) {
        newSet.delete(jurisdiction);
      } else {
        newSet.add(jurisdiction);
      }
      return newSet;
    });
  };

  // Add state for jurisdiction pagination
  const [jurisdictionPages, setJurisdictionPages] = useState({});
  const PREVIEW_COUNT = 3;
  const DOCS_PER_PAGE = 10;

  // Initialize or update jurisdiction pages when results change
  useEffect(() => {
    const newPages = {};
    Object.keys(groupedResults).forEach(jurisdiction => {
      newPages[jurisdiction] = 1;
    });
    setJurisdictionPages(newPages);
  }, [results]);

  const handleJurisdictionPage = (jurisdiction, direction) => {
    setJurisdictionPages(prev => {
      const totalPages = Math.ceil(groupedResults[jurisdiction].length / DOCS_PER_PAGE);
      const currentPage = prev[jurisdiction] || 1;
      const newPage = direction === 'next' 
        ? Math.min(currentPage + 1, totalPages)
        : Math.max(currentPage - 1, 1);
      return { ...prev, [jurisdiction]: newPage };
    });
  };

  const getJurisdictionDocs = (jurisdiction, preview = false) => {
    const docs = groupedResults[jurisdiction];
    if (preview) {
      return docs.slice(0, PREVIEW_COUNT);
    }
    const page = jurisdictionPages[jurisdiction] || 1;
    const start = (page - 1) * DOCS_PER_PAGE;
    return docs.slice(start, start + DOCS_PER_PAGE);
  };

  // Fixed palette of visually distinct, accessible colors
  const FOLDER_COLORS = [
    '#ff7043', // deep orange
    '#42a5f5', // blue
    '#66bb6a', // green
    '#ab47bc', // purple
    '#ffa726', // orange
    '#26a69a', // teal
    '#ec407a', // pink
    '#7e57c2', // deep purple
    '#d4e157', // lime
    '#789262', // olive
    '#8d6e63', // brown
    '#29b6f6', // light blue
    '#cfd8dc', // blue gray
    '#f06292', // pink accent
    '#ffd600', // yellow accent
  ];

  const dropdownCloseTimeout = useRef();
  const dropdownButtonRefs = useRef({});
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (addToFolderDropdownId !== null && dropdownButtonRefs.current[addToFolderDropdownId]) {
      const rect = dropdownButtonRefs.current[addToFolderDropdownId].getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
      });
    }
  }, [addToFolderDropdownId, results]);

  useEffect(() => {
    if (addToFolderDropdownId && dropdownRef.current) {
      const dropdownRect = dropdownRef.current.getBoundingClientRect();
      const overflowRight = (addToFolderDropdownCoords.left + dropdownRect.width) - window.innerWidth;
      if (overflowRight > 0) {
        setAddToFolderDropdownCoords(coords => ({
          ...coords,
          left: Math.max(8, coords.left - overflowRight - 8)
        }));
      }
    }
  }, [addToFolderDropdownId, addToFolderDropdownCoords.left]);

  const renderResultCard = (result, index) => {
    const userFolders = folders.filter(f => f.name !== 'Working Folder');
    const hasUserFolders = userFolders.length > 0;
    const foldersContainingDoc = userFolders.filter(folder => folder.documents.some(doc => doc.id === result.id));
    return (
      <div key={`${result.id || index}`} className="result-card" style={{ position: 'relative' }}>
        <div className="result-card-header">
          <h3>
            <a href={result.url} target="_blank" rel="noopener noreferrer">
              {result.title}
            </a>
          </h3>
          <div
            style={{ position: 'relative', display: 'flex', gap: 8 }}
            onMouseLeave={() => {
              dropdownCloseTimeout.current = setTimeout(() => setAddToFolderDropdownId(null), 200);
            }}
            onMouseEnter={() => {
              if (dropdownCloseTimeout.current) {
                clearTimeout(dropdownCloseTimeout.current);
                dropdownCloseTimeout.current = null;
              }
            }}
          >
            {/* Folder color indicators */}
            {foldersContainingDoc.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginRight: 2 }}>
                {foldersContainingDoc.map((folder, i) => (
                  <span key={folder.id} style={{
                    display: 'inline-block',
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: FOLDER_COLORS[userFolders.findIndex(f => f.id === folder.id) % FOLDER_COLORS.length],
                    border: '1.5px solid #fff',
                    boxShadow: '0 0 0 1px #ccc',
                    marginLeft: i === 0 ? 0 : -4,
                  }} />
                ))}
              </div>
            )}
            <button
              className="add-direct-to-folder-button"
              title={hasUserFolders ? 'Add directly to folder' : 'No folders available'}
              onClick={e => {
                if (hasUserFolders) {
                  if (addToFolderDropdownId === result.id) {
                    setAddToFolderDropdownId(null);
                  } else {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setAddToFolderDropdownCoords({
                      top: rect.bottom + window.scrollY,
                      left: rect.left + window.scrollX
                    });
                    setAddToFolderDropdownId(result.id);
                  }
                } else {
                  setPendingAddToFolderDoc(result);
                  setShowCreateFolderModal(true);
                }
              }}
              style={{ marginLeft: 4 }}
              ref={el => (dropdownButtonRefs.current[index] = el)}
            >
              <CreateNewFolderIcon style={{ color: '#ffb300', width: 20, height: 20, background: 'none' }} />
            </button>
            {addToFolderDropdownId === result.id && hasUserFolders && ReactDOM.createPortal(
              <div
                ref={dropdownRef}
                className="add-to-folder-dropdown"
                style={{
                  position: 'absolute',
                  left: addToFolderDropdownCoords.left,
                  top: addToFolderDropdownCoords.top,
                  zIndex: 2000,
                  background: '#fff',
                  border: '1.5px solid #e0e6ed',
                  borderRadius: 10,
                  boxShadow: '0 4px 16px rgba(39,76,119,0.10)',
                  padding: '2px 8px',
                  minWidth: 140,
                  fontSize: 12,
                  color: '#274C77',
                  fontFamily: 'Roboto Condensed, Roboto, Arial, sans-serif',
                  fontWeight: 400,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                }}
                onMouseEnter={() => {
                  if (dropdownCloseTimeout.current) {
                    clearTimeout(dropdownCloseTimeout.current);
                    dropdownCloseTimeout.current = null;
                  }
                }}
                onMouseLeave={() => {
                  dropdownCloseTimeout.current = setTimeout(() => setAddToFolderDropdownId(null), 200);
                }}
              >
                {userFolders.map(folder => {
                  const alreadyInFolder = folder.documents.some(doc => doc.id === result.id);
                  return (
                    <div
                      key={folder.id}
                      className="add-to-folder-dropdown-item"
                      style={{
                        display: 'block',
                        width: '100%',
                        textAlign: 'left',
                        padding: '2px 0 2px 10px',
                        background: 'none',
                        border: 'none',
                        cursor: alreadyInFolder ? 'not-allowed' : 'pointer',
                        color: alreadyInFolder ? '#aaa' : 'inherit',
                        opacity: alreadyInFolder ? 0.7 : 1,
                        position: 'relative',
                        borderRadius: 6,
                        transition: 'background 0.15s',
                        fontWeight: 400,
                        fontSize: 12,
                      }}
                      onMouseDown={e => e.preventDefault()}
                      onClick={() => {
                        if (!alreadyInFolder) {
                          console.log("🔴🔴🔴 ADDING DOCUMENT TO FOLDER FROM DROPDOWN 🔴🔴🔴");
                          console.log("Document:", result);
                          console.log("Target folder:", folder);
                          
                          // Call the remote API instead of just local state update
                          addToFolderRemote(result, folder.id)
                            .then(success => {
                              console.log("🔴🔴🔴 Document add result from dropdown:", success ? "SUCCESS" : "FAILED", "🔴🔴🔴");
                            })
                            .catch(error => {
                              console.error("🔴🔴🔴 Error adding document from dropdown:", error, "🔴🔴🔴");
                            });
                            
                          setAddToFolderDropdownId(null);
                        }
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(69,123,157,0.07)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'none'}
                    >
                      {folder.name}
                      {alreadyInFolder && (
                        <span style={{ marginLeft: 8, color: '#4caf50', fontSize: 12, fontWeight: 600 }}>✔</span>
                      )}
                    </div>
                  );
                })}
              </div>,
              document.body
            )}
          </div>
        </div>
        <p className="result-description">{result.description}</p>
        <div className="result-meta">
          <span className="result-jurisdiction">{result.jurisdiction}</span>
          <span className="result-type">{getDocumentType(result)}</span>
        </div>
      </div>
    );
  };
  
  return (
    <div className={`dynamic-search-container ${!results.length && !loading ? 'empty-state' : ''}`}>
      {(!results.length && !loading) && (
        <div className="dynamic-search-header">
          <h1>Dynamic Search</h1>
          <p>An advanced search experience with real-time filtering and visualization</p>
        </div>
      )}
      
      <div className="search-input-container">
        <form onSubmit={handleSubmit}>
          <img src={searchIcon} alt="Dynamic Search" className="search-input-icon" />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Enter your search query..."
            className="dynamic-search-input"
            style={{ paddingLeft: 44 }}
          />
          <button type="submit" className="dynamic-search-button">
            Search
          </button>
        </form>
        <div className="layout-toggle">
          <button 
            className={viewMode === 'folder' ? 'active' : ''} 
            onClick={() => setViewMode('folder')}
            title="List View"
          >
            <FaList />
          </button>
          <button 
            className={viewMode === 'grid' ? 'active' : ''} 
            onClick={() => setViewMode('grid')}
            title="Grid View"
          >
            <FaThLarge />
          </button>
          <button 
            className={viewMode === 'jurisdiction' ? 'active' : ''} 
            onClick={() => setViewMode('jurisdiction')}
            title="Jurisdiction View"
          >
            <FaGlobe />
          </button>
        </div>
      </div>
      
      {!searchInitiated && !loading && (
        <div className="suggested-searches" style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
          <span style={{ color: '#6c7a89', fontWeight: 400, fontSize: 13, marginRight: 8 }}>Examples:</span>
          {suggestedSearches.map((suggestion, index) => (
            <button
              key={index}
              className="suggested-search-item"
              onClick={() => handleSuggestedSearch(suggestion)}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
      
      {loading && (
        <div className="dynamic-search-loading">
          <div className="spinner" />
          <p>Loading results...</p>
        </div>
      )}
      
      {error && (
        <div className="dynamic-search-error">
          <p>Error: {error.message}</p>
        </div>
      )}
      
      <div className="dynamic-search-results">
        {results.length > 0 && !loading && (
          <>
            <div className="results-summary">
              <p>
                Showing {indexOfFirstResult + 1}-{Math.min(indexOfLastResult, Math.min(results.length, maxResults))} of {Math.min(results.length, maxResults)} documents
                {results.length > maxResults && ` (displaying first ${maxResults} of ${results.length} total results)`}
              </p>
            </div>
            
            <div className={`results-grid ${viewMode}-view`}>
              {viewMode === 'jurisdiction' ? (
                sortedJurisdictions.map(jurisdiction => {
                  const isExpanded = expandedJurisdictions.has(jurisdiction);
                  const totalDocs = groupedResults[jurisdiction].length;
                  const currentPage = jurisdictionPages[jurisdiction] || 1;
                  const totalPages = Math.ceil(totalDocs / DOCS_PER_PAGE);
                  const start = (currentPage - 1) * DOCS_PER_PAGE;
                  const end = Math.min(start + DOCS_PER_PAGE, totalDocs);

                  return (
                    <div 
                      key={jurisdiction} 
                      className={`jurisdiction-group ${isExpanded ? 'expanded' : ''}`}
                    >
                      <div 
                        className="jurisdiction-header"
                        onClick={() => toggleJurisdiction(jurisdiction)}
                      >
                        <div className="jurisdiction-title-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                          <h3 className="jurisdiction-title" style={{ margin: 0 }}>
                            {jurisdiction.replace(/_/g, ' ')}
                          </h3>
                          <span className="jurisdiction-count">
                            {totalDocs}
                          </span>
                          <button 
                            className="expand-button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleJurisdiction(jurisdiction);
                            }}
                            aria-label={isExpanded ? 'Collapse' : 'Expand'}
                          >
                            {console.log('Jurisdiction:', jurisdiction, 'isExpanded:', isExpanded)}
                            {isExpanded ? <FaChevronUp /> : <FaChevronDown />}
                          </button>
                        </div>
                      </div>

                      {!isExpanded && (
                        <>
                          <div className="jurisdiction-preview">
                            {getJurisdictionDocs(jurisdiction, true).map((result, index) => 
                              renderResultCard(result, index)
                            )}
                          </div>
                          {totalDocs > PREVIEW_COUNT && (
                            <button 
                              className="show-all-button"
                              onClick={() => toggleJurisdiction(jurisdiction)}
                            >
                              Show all {totalDocs} <FaChevronDown />
                            </button>
                          )}
                        </>
                      )}

                      {isExpanded && (
                        <>
                          <div className="jurisdiction-content">
                            {getJurisdictionDocs(jurisdiction).map((result, index) => 
                              renderResultCard(result, index)
                            )}
                          </div>
                          <div className="jurisdiction-navigation">
                            <button
                              className="jurisdiction-nav-button"
                              onClick={() => handleJurisdictionPage(jurisdiction, 'prev')}
                              disabled={currentPage === 1}
                            >
                              <FaChevronLeft /> Previous
                            </button>
                            <span className="jurisdiction-nav-info">
                              {start + 1}-{end} of {totalDocs}
                            </span>
                            <button
                              className="jurisdiction-nav-button"
                              onClick={() => handleJurisdictionPage(jurisdiction, 'next')}
                              disabled={currentPage === totalPages}
                            >
                              Next <FaChevronRight />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })
              ) : (
                currentResults.map((result, index) => renderResultCard(result, index))
              )}
            </div>
            
            {totalPages > 1 && (
              <div className="pagination-controls">
                <button 
                  onClick={goToPreviousPage} 
                  disabled={currentPage === 1}
                  className="pagination-button"
                >
                  Previous
                </button>
                
                <div className="pagination-numbers">
                  {pageNumbers.map(number => (
                    <button
                      key={number}
                      onClick={() => paginate(number)}
                      className={`pagination-number ${currentPage === number ? 'active' : ''}`}
                    >
                      {number}
                    </button>
                  ))}
                </div>
                
                <button 
                  onClick={goToNextPage} 
                  disabled={currentPage === totalPages}
                  className="pagination-button"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
        {searchInitiated && !loading && results.length === 0 && (
          <p className="no-results">No results found. Try a different search query.</p>
        )}
      </div>
      <CreateFolderModal
        isOpen={showCreateFolderModal}
        onClose={() => {
          setShowCreateFolderModal(false);
          setPendingAddToFolderDoc(null);
        }}
        onCreateFolder={async (folderName) => {
          try {
            const newFolder = await createFolder(folderName);
            if (pendingAddToFolderDoc && newFolder) {
              // Update to use remote API
              addToFolderRemote(pendingAddToFolderDoc, newFolder.id)
                .then(success => {
                  console.log("🔴🔴🔴 Document add result after folder creation:", success ? "SUCCESS" : "FAILED", "🔴🔴🔴");
                })
                .catch(error => {
                  console.error("🔴🔴🔴 Error adding document after folder creation:", error, "🔴🔴🔴");
                });
              setPendingAddToFolderDoc(null);
            }
            setShowCreateFolderModal(false);
          } catch (error) {
            console.error("Failed to create folder:", error);
            setShowCreateFolderModal(false);
          }
        }}
      />
    </div>
  );
};

export default DynamicSearch;