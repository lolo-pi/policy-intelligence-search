import React, { useEffect, useState } from 'react';
import './PiCoPilot.css';
import MessageHistory from './MessageHistory';
import ChatArea from './ChatArea';
import CitationsPanel from './CitationsPanel';
import SidebarFilters from './SidebarFilters';
import { useWorkingFolder } from '../context/WorkingFolderContext';
import { useChunkedDocs } from '../context/ChunkedDocsContext';

// Import the AI avatar image
import aiAvatar from '../assets/AI-technology.png';

const PiCoPilot = () => {
  const { workingFolderDocs } = useWorkingFolder();
  const { 
    chunks, 
    chunkDocMap, 
    docTitles,
    isLoading, 
    error, 
    progress, 
    ingestDocuments,
    clearChunks
  } = useChunkedDocs();
  
  const [documentsWithS3Paths, setDocumentsWithS3Paths] = useState([]);
  const [ingestionComplete, setIngestionComplete] = useState(false);
  const [partialSuccess, setPartialSuccess] = useState(false);
  
  // Example history items
  const historyItems = [
    'Tell me about PM2.5 regulations in...',
    'How does California\'s oil and gas e...',
    'Tell me about PM2.5 regulations in...',
    'What bills related to electric vehicl...',
    'How have states implemented co...',
    'What state-level policies incentiv...',
    'Which cities have adopted congest...',
  ];

  // Example citations
  const citations = [
    {
      title: 'Colorado - Regulation Number 20 - Colorado Low Emission Automobile Regulation',
      text: '...pursuant to §25-7-122, C.R.S. PART E HEAVY DUTY LOW NOx REGULATION (HD LOW NOx) I. Purpose The purpose of this Part E is to establish Colorado heavy-duty engine and vehicle standards that incorporate California engine and vehicle emission standards as provided for under Section...'
    },
    {
      title: 'Colorado - Regulation Number 12 - Reduction of Diesel Vehicle Emissions',
      text: 'I.B.27. "Heavy-duty Diesel Vehicle" as applicable to the Diesel Opacity Inspection Program refers to diesel vehicles of greater than fourteen thousand pounds GVWR. I.B.28. "Heavy-duty Diesel Opacity Inspection Station" means a facility licensed to inspect heavy-duty diesel vehicles only. I...'
    },
    {
      title: 'Colorado - Regulation Number 11 - Motor Vehicle Emissions Inspection Program',
      text: '...Emissions Limits for Motor Vehicle Exhaust, Evaporative and Visible Emissions for Light-Duty and Heavy-Duty Vehicles In order for a vehicle (owner) to obtain a Certificate of Emissions Compliance, the exhaust and evaporative emissions from the motor vehicle subject to an EPA approved...'
    }
  ];

  // Track and filter documents with valid S3 paths
  useEffect(() => {
    // Filter documents that have an S3 path
    const validDocs = workingFolderDocs.filter(doc => doc.s3Path && doc.s3Path.startsWith('s3://'));
    
    if (validDocs.length > 0) {
      console.log('Documents with S3 paths for processing:', validDocs);
      setDocumentsWithS3Paths(validDocs);
    } else {
      console.log('No documents with valid S3 paths found in working folder');
      setDocumentsWithS3Paths([]);
    }
  }, [workingFolderDocs]);
  
  // Reset ingestion state when documents change
  useEffect(() => {
    setIngestionComplete(false);
    setPartialSuccess(false);
  }, [workingFolderDocs]);

  const handleFilterChange = (filters) => {
    // Handle filter changes if needed
    console.log('Filters changed:', filters);
  };
  
  const handleIngestDocuments = async () => {
    if (documentsWithS3Paths.length === 0) {
      alert('Please add documents with valid S3 paths to your working folder first.');
      return;
    }
    
    try {
      console.log('Starting document ingestion with:', documentsWithS3Paths);
      const success = await ingestDocuments(documentsWithS3Paths);
      
      // Check if we have a partial success (some chunks but also errors)
      if (success && error) {
        setPartialSuccess(true);
        setIngestionComplete(false); // Don't show full success message
      } else {
        setIngestionComplete(success);
        setPartialSuccess(false);
      }
      
      if (success) {
        console.log('Document ingestion completed successfully');
        // Wait slightly longer to ensure state is completely updated
        setTimeout(() => {
          // Get a fresh reference to the current state
          const currentChunks = chunks;
          const currentChunkDocMap = chunkDocMap;
          const currentDocTitles = docTitles;
          
          console.log('Current chunks available:', currentChunks.length);
          console.log('Current chunk to doc mapping entries:', currentChunkDocMap.length);
          console.log('Current document titles entries:', Object.keys(currentDocTitles).length);
          
          // If the state is empty when it shouldn't be, add a warning
          if (currentChunks.length === 0 && success) {
            console.warn('State update may be delayed. Data was processed but not yet available in state.');
          }
        }, 500);
      }
    } catch (err) {
      console.error('Error in document ingestion:', err);
    }
  };

  return (
    <div className="main-layout">
      <aside className="sidebar">
        {/* Document Processing Section */}
        <div className="document-processing-section">
          <h3>Document Processing</h3>
          
          {/* Document List */}
          <div className="working-folder-status">
            <h4>Available Documents</h4>
            {documentsWithS3Paths.length === 0 ? (
              <p>No documents with S3 paths available.</p>
            ) : (
              <ul className="s3-document-list">
                {documentsWithS3Paths.map((doc, index) => (
                  <li key={doc.id || index} className="s3-document-item">
                    <div className="doc-title">{doc.title}</div>
                    <div className="doc-path">{doc.s3Path}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          
          {/* Ingestion Controls */}
          <div className="ingestion-controls">
            <button 
              className="ingest-button"
              onClick={handleIngestDocuments}
              disabled={isLoading || documentsWithS3Paths.length === 0}
            >
              {isLoading ? 'Processing...' : 'Process Documents'}
            </button>
            
            {chunks.length > 0 && (
              <button 
                className="clear-button"
                onClick={clearChunks}
                disabled={isLoading}
              >
                Clear Chunks
              </button>
            )}
          </div>
          
          {/* Progress Indicator */}
          {isLoading && (
            <div className="ingestion-progress">
              <div className="progress-bar">
                <div 
                  className="progress-fill"
                  style={{ width: `${(progress.completed / Math.max(progress.total, 1)) * 100}%` }}
                />
              </div>
              <p className="progress-message">{progress.message}</p>
            </div>
          )}
          
          {/* Error Display */}
          {error && (
            <div className="ingestion-error">
              <p className="error-message">{error}</p>
            </div>
          )}
          
          {/* Chunks Status */}
          {chunks.length > 0 && (
            <div className="chunks-status">
              <h4>Processed Data</h4>
              <p>{chunks.length} chunks from {Object.keys(docTitles).length} documents ready for chat</p>
              {ingestionComplete && <p className="success-message">✓ Documents processed successfully</p>}
              {partialSuccess && (
                <p className="partial-success-message">
                  ⚠️ Some documents were successfully processed, but others failed. You can proceed with the
                  documents that were successfully processed.
                </p>
              )}
            </div>
          )}
        </div>
      </aside>
      
      <div className="copilot-container">
        <div className="copilot-content">
          <MessageHistory />
          <ChatArea />
          <CitationsPanel />
        </div>
      </div>
    </div>
  );
};

export default PiCoPilot; 