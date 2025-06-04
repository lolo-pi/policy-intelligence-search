import React, { useEffect } from 'react';
import './FoldersPage.css';
import SidebarFilters from './SidebarFilters';
import { FaFolderPlus, FaFolderMinus, FaExpand, FaCompress, FaExclamationTriangle } from 'react-icons/fa';
import { useWorkingFolder } from '../context/WorkingFolderContext';
import { useFolderPage } from '../context/FolderPageContext';
import FolderSearchBar from './FolderSearchBar';

// Import mock data as fallback
import mockDataCO2 from '../mockDataCO2.js';
import mockDataNM from '../mockDataNM';
import mockDataSCAQMD from '../mockDataSCAQMD.js';
import mockDataBAAD from '../mockDataBAAD';
import mockDataTX from '../mockDataTX';
import mockDataWA from '../mockDataWA';
import mockDataUT from '../mockDataUT';

// Define the jurisdictions we want to display
const jurisdictions = [
  'Colorado',
  'New_Mexico',
  'South_Coast_AQMD',
  'Bay_Area_AQMD',
  'Texas',
  'Washington',
  'Arizona',
  'New_York',
  'Sacramento_AQMD',
  'Minnesota'
];

// Mapping between Kendra format (with spaces) and code format (with underscores)
const jurisdictionMapping = {
  'New Mexico': 'New_Mexico',
  'South Coast AQMD': 'South_Coast_AQMD',
  'Bay Area AQMD': 'Bay_Area_AQMD',
  'Sacramento AQMD': 'Sacramento_AQMD',
  // Add direct mappings for non-spaced jurisdictions
  'Colorado': 'Colorado',
  'Texas': 'Texas',
  'Washington': 'Washington',
  'Arizona': 'Arizona',
  'New York': 'New_York',
  'Minnesota': 'Minnesota'
};

// Reverse mapping for display and Kendra searches
const reverseJurisdictionMapping = Object.fromEntries(
  Object.entries(jurisdictionMapping).map(([key, value]) => [value, key])
);

// Helper function to convert Kendra format to code format
const getCodeJurisdiction = (kendraJurisdiction) => {
  return jurisdictionMapping[kendraJurisdiction] || kendraJurisdiction;
};

// Helper function to convert code format to Kendra format
const getKendraJurisdiction = (codeJurisdiction) => {
  return reverseJurisdictionMapping[codeJurisdiction] || codeJurisdiction;
};

// List of document types for filtering - match exact Kendra values
const documentTypes = [
  'Regulation',
  ' Source Report',
  'Compliance Document',
  'Guidance-Policy',
  'Form-Template',
  'State Implementation Plan',
  'Protocol',
  'General Info Item',
  'Legislation'
];

// Fallback mock data
const mockJurisdictionData = {
  'Colorado': {
    name: 'Colorado',
    documents: mockDataCO2,
  },
  'New_Mexico': {
    name: 'New_Mexico',
    documents: mockDataNM,
  },
  'South_Coast_AQMD': {
    name: 'South_Coast_AQMD',
    documents: mockDataSCAQMD,
  },
  'Bay_Area_AQMD': {
    name: 'Bay_Area_AQMD',
    documents: mockDataBAAD,
  },
  'Texas': {
    name: 'Texas',
    documents: mockDataTX,
  },
  'Washington': {
    name: 'Washington',
    documents: mockDataWA,
  },
  'Utah': {
    name: 'Utah',
    documents: mockDataUT,
  }
};

// Debug function to log document type details
function logDocTypeDetails(docType) {
  if (!docType) return;
  console.log('Filter - Document type details:');
  console.log(`- Original: "${docType}"`);
  console.log(`- Trimmed: "${docType.trim()}"`);
  console.log(`- Length: ${docType.length}`);
  console.log(`- Char codes:`, Array.from(docType).map(c => c.charCodeAt(0)));
}

// Function to display document type without leading spaces and handle all possible types
const getDisplayType = (type) => {
  if (!type || type === 'Unknown') return null;
  
  // Remove any leading/trailing spaces for display purposes only
  const trimmedType = type.trim();
  
  // Match our predefined document types
  const typeMap = {
    'regulation': 'Regulation',
    'source report': 'Source Report',
    'compliance document': 'Compliance Document',
    'guidance-policy': 'Guidance-Policy',
    'form-template': 'Form-Template',
    'state implementation plan': 'State Implementation Plan',
    'protocol': 'Protocol',
    'general info item': 'General Info Item',
    'legislation': 'Legislation'
  };
  
  // Check for an exact match (case-insensitive)
  const lowerType = trimmedType.toLowerCase();
  if (typeMap[lowerType]) {
    return typeMap[lowerType];
  }
  
  // If it doesn't match our predefined types, use the original but trim
  return trimmedType;
};

// Helper function to format jurisdiction names for display (replace underscores with spaces)
const formatJurisdictionDisplay = (jurisdiction) => {
  return jurisdiction.replace(/_/g, ' ');
};

const FoldersPage = () => {
  // Get context values and functions from the FolderPageContext
  const {
    filters,
    searchQuery,
    loading,
    error,
    jurisdictionResults,
    usingMockData,
    expandedFolders,
    documentCounts,
    handleFilterChange,
    handleSearch,
    toggleFolderExpand,
    initializeSearch,
    getFilteredDocuments
  } = useFolderPage();

  // Get working folder functionality from context
  const { workingFolderDocs, addToWorkingFolder, removeFromWorkingFolder } = useWorkingFolder();

  // Initialize search on first mount or when returning to the page
  useEffect(() => {
    // Small delay to ensure context is fully initialized
    const timer = setTimeout(() => {
      initializeSearch();
    }, 0);
    
    return () => clearTimeout(timer);
  }, [initializeSearch]); // Add initializeSearch to dependencies

  return (
    <div className="folders-page">
      <FolderSearchBar />
      {usingMockData && (
        <div className="mock-data-warning">
          <FaExclamationTriangle className="warning-icon" />
          <span>Using mock data - API connection may be unavailable</span>
        </div>
      )}
      <div className="app-wrapper">
        <div className="main-layout">
          <aside className="sidebar">
            <SidebarFilters 
              onFilterChange={handleFilterChange} 
              instanceId="folders-page" 
              documentCounts={documentCounts}
            />
          </aside>
          
          <div className="folders-container">
            <div className="folders-scroll-container">
              <div className="folders-grid">
                {Object.values(jurisdictionResults).map((jurisdiction) => {
                  if (!jurisdiction) return null; // Skip if jurisdiction data isn't loaded yet
                  
                  const filteredDocs = getFilteredDocuments(jurisdiction.documents, jurisdiction.name);
                  if (filteredDocs.length === 0) return null; // Don't show empty folders
                  
                  return (
                    <div key={jurisdiction.name} className={`folder-card ${expandedFolders.has(jurisdiction.name) ? 'expanded' : ''}`}>
                      <div className="folder-header">
                        <div className="folder-title-container">
                          <h3 className="folder-title">{jurisdiction.name.replace(/_/g, ' ')}</h3>
                          <div className="folder-meta">
                            <span className="folder-type">Folder</span>
                            <span className="document-count">{filteredDocs.length} documents</span>
                          </div>
                        </div>
                        <button 
                          className="expand-button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFolderExpand(jurisdiction.name);
                          }}
                        >
                          {expandedFolders.has(jurisdiction.name) ? <FaCompress /> : <FaExpand />}
                        </button>
                      </div>
                      <div className="folder-content">
                        <div className="folder-files">
                          {filteredDocs.map((doc, index) => {
                            // Generate a truly unique key using jurisdiction, document ID and index
                            const uniqueKey = `${jurisdiction.name}-${doc.id || ''}-${index}`;
                            
                            return (
                              <div key={uniqueKey} className="file-card">
                                <div className="file-header">
                                  {doc.url ? (
                                    <a 
                                      href={doc.url} 
                                      target="_blank" 
                                      rel="noopener noreferrer" 
                                      className="file-title"
                                    >
                                      {doc.title}
                                    </a>
                                  ) : (
                                    <span className="file-title no-link">{doc.title}</span>
                                  )}
                                  <button
                                    className={`add-to-folder-button ${workingFolderDocs.some(wDoc => wDoc.id === doc.id) ? 'in-folder' : ''}`}
                                    onClick={() => {
                                      const isInFolder = workingFolderDocs.some(wDoc => wDoc.id === doc.id);
                                      if (isInFolder) {
                                        removeFromWorkingFolder(doc.id);
                                      } else {
                                        addToWorkingFolder(doc);
                                      }
                                    }}
                                    title={workingFolderDocs.some(wDoc => wDoc.id === doc.id) ? "Remove from Working Folder" : "Add to Working Folder"}
                                  >
                                    {workingFolderDocs.some(wDoc => wDoc.id === doc.id) ? <FaFolderMinus /> : <FaFolderPlus />}
                                  </button>
                                </div>
                                <p className="file-description">{doc.description || 'No description available'}</p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {!loading.all && Object.keys(jurisdictionResults).length === 0 && (
                  <div className="no-results">
                    <p>No results found. Try adjusting your search query or filters.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FoldersPage; 