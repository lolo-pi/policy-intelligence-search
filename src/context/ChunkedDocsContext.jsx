import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

const ChunkedDocsContext = createContext();

export function ChunkedDocsProvider({ children }) {
  // Add refs to track the latest state values
  const chunksRef = useRef([]);
  const chunkDocMapRef = useRef([]);
  const docTitlesRef = useRef({});
  
  const [chunks, setChunks] = useState([]);
  const [chunkDocMap, setChunkDocMap] = useState([]);
  const [docTitles, setDocTitles] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState({
    total: 0,
    completed: 0,
    message: '',
  });
  
  // Keep refs updated with latest state values
  useEffect(() => {
    chunksRef.current = chunks;
  }, [chunks]);
  
  useEffect(() => {
    chunkDocMapRef.current = chunkDocMap;
  }, [chunkDocMap]);
  
  useEffect(() => {
    docTitlesRef.current = docTitles;
  }, [docTitles]);
  
  // For debugging - log state changes
  useEffect(() => {
    console.log("ChunkedDocs state updated:", { 
      chunks: chunks.length, 
      chunkDocMap: chunkDocMap.length, 
      docTitles: Object.keys(docTitles).length 
    });
  }, [chunks, chunkDocMap, docTitles]);

  // Function to handle large documents by splitting the ingestion request
  const ingestMultipleDocuments = async (documents) => {
    // Extract S3 paths from documents
    const s3Paths = documents
      .filter(doc => doc.s3Path && doc.s3Path.startsWith('s3://'))
      .map(doc => doc.s3Path);

    if (s3Paths.length === 0) {
      setError('No valid S3 paths found in selected documents');
      return false;
    }

    setIsLoading(true);
    setError(null);
    setProgress({
      total: s3Paths.length,
      completed: 0,
      message: 'Starting document ingestion...'
    });

    // Process documents one by one to avoid Lambda timeouts
    let allChunks = [...chunksRef.current]; // Start with current chunks
    let allChunkDocMap = [...chunkDocMapRef.current]; // Start with current mapping
    let allDocTitles = {...docTitlesRef.current}; // Start with current titles
    let failedDocs = [];
    let successCount = 0;

    for (let i = 0; i < s3Paths.length; i++) {
      const docPath = s3Paths[i];
      
      setProgress(prev => ({
        ...prev,
        completed: i,
        message: `Processing document ${i+1} of ${s3Paths.length}...`
      }));
      
      try {
        const result = await ingestSingleDocument(docPath);
        if (result.success) {
          // Append results to our collective arrays/objects
          allChunks = [...allChunks, ...result.chunks];
          allChunkDocMap = [...allChunkDocMap, ...result.chunkDocMap];
          allDocTitles = {...allDocTitles, ...result.docTitles};
          
          // Immediately update the state after each successful document
          setChunks(allChunks);
          setChunkDocMap(allChunkDocMap);
          setDocTitles(allDocTitles);
          
          successCount++;
        } else {
          failedDocs.push(docPath);
        }
      } catch (err) {
        console.error(`Error processing document ${docPath}:`, err);
        failedDocs.push(docPath);
      }
    }

    // Final state update
    setChunks(allChunks);
    setChunkDocMap(allChunkDocMap);
    setDocTitles(allDocTitles);
    
    // Set final progress
    setProgress(prev => ({
      ...prev,
      completed: s3Paths.length,
      message: failedDocs.length > 0 
        ? `Completed with ${failedDocs.length} errors` 
        : 'Document processing complete!'
    }));
    
    // Set error if any documents failed
    if (failedDocs.length > 0) {
      setError(`Failed to process ${failedDocs.length} documents. ${successCount} documents processed successfully.`);
    }
    
    setIsLoading(false);
    return successCount > 0;
  };
  
  // Helper function to process a single document
  const ingestSingleDocument = async (docPath) => {
    const endpoint = 'https://gbgi989gbe.execute-api.us-west-2.amazonaws.com/sbx/documents';
    
    // Maximum number of retry attempts
    const maxRetries = 3;
    let retryCount = 0;
    
    while (retryCount < maxRetries) {
      try {
        console.log(`Processing document: ${docPath} (attempt ${retryCount + 1}/${maxRetries})`);
        
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            document_s3_paths: [docPath]
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Server responded with ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        console.log(`Document processed successfully: ${docPath}`, data);
        
        return {
          success: true,
          chunks: data.chunks || [],
          chunkDocMap: data.chunk_doc_map || [],
          docTitles: data.doc_titles || {}
        };
      } catch (err) {
        retryCount++;
        console.error(`Error processing document (attempt ${retryCount}/${maxRetries}):`, err);
        
        if (retryCount >= maxRetries) {
          console.error(`Failed to process document after ${maxRetries} attempts:`, docPath);
          return { success: false };
        } else {
          // Wait before retrying (exponential backoff)
          const delay = 1000 * (2 ** retryCount);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    return { success: false };
  };

  // Function to ingest documents and process them into chunks
  const ingestDocuments = async (documents) => {
    // For large document sets, use the individual processing method
    if (documents.length > 1 || documents.some(doc => doc.title && doc.title.includes('400 pages'))) {
      return ingestMultipleDocuments(documents);
    }
    
    // Extract S3 paths from documents
    const s3Paths = documents
      .filter(doc => doc.s3Path && doc.s3Path.startsWith('s3://'))
      .map(doc => doc.s3Path);

    if (s3Paths.length === 0) {
      setError('No valid S3 paths found in selected documents');
      return false;
    }

    setIsLoading(true);
    setError(null);
    setProgress({
      total: s3Paths.length,
      completed: 0,
      message: 'Starting document ingestion...'
    });

    const endpoint = 'https://gbgi989gbe.execute-api.us-west-2.amazonaws.com/sbx/documents';
    
    // Maximum number of retry attempts
    const maxRetries = 3;
    let retryCount = 0;
    let success = false;
    
    while (retryCount < maxRetries && !success) {
      try {
        setProgress(prev => ({
          ...prev,
          message: retryCount > 0 ? `Retry attempt ${retryCount}...` : 'Sending documents for processing...'
        }));

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            document_s3_paths: s3Paths
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Server responded with ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        console.log('Document ingestion successful:', data);
        
        // Explicitly log the data before setting state
        console.log('Setting chunks:', data.chunks?.length || 0, 'items');
        console.log('Setting chunkDocMap:', data.chunk_doc_map?.length || 0, 'items');
        console.log('Setting docTitles:', Object.keys(data.doc_titles || {}).length, 'items');
        
        // Update state with the chunked documents data - ensure we're setting values
        if (data.chunks && data.chunks.length > 0) {
          setChunks(data.chunks);
          chunksRef.current = data.chunks;
        }
        
        if (data.chunk_doc_map && data.chunk_doc_map.length > 0) {
          setChunkDocMap(data.chunk_doc_map);
          chunkDocMapRef.current = data.chunk_doc_map;
        }
        
        if (data.doc_titles && Object.keys(data.doc_titles).length > 0) {
          setDocTitles(data.doc_titles);
          docTitlesRef.current = data.doc_titles;
        }
        
        setProgress(prev => ({
          ...prev,
          completed: prev.total,
          message: 'Document processing complete!'
        }));
        
        success = true;
      } catch (err) {
        retryCount++;
        console.error(`Error ingesting documents (attempt ${retryCount}/${maxRetries}):`, err);
        
        if (retryCount >= maxRetries) {
          setError(`Failed to process documents after ${maxRetries} attempts: ${err.message}`);
          setProgress(prev => ({
            ...prev,
            message: 'Document processing failed'
          }));
        } else {
          // Wait before retrying (exponential backoff)
          const delay = 1000 * (2 ** retryCount);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    setIsLoading(false);
    return success;
  };

  // Function to clear all chunks data
  const clearChunks = () => {
    setChunks([]);
    setChunkDocMap([]);
    setDocTitles({});
    chunksRef.current = [];
    chunkDocMapRef.current = [];
    docTitlesRef.current = {};
    setError(null);
    setProgress({
      total: 0,
      completed: 0,
      message: '',
    });
  };

  // Function to get document title for a chunk
  const getDocumentTitle = (chunkIndex) => {
    if (chunkIndex < 0 || chunkIndex >= chunkDocMap.length) {
      return 'Unknown Document';
    }
    
    const s3Path = chunkDocMap[chunkIndex];
    return docTitles[s3Path] || s3Path || 'Unknown Document';
  };

  return (
    <ChunkedDocsContext.Provider
      value={{
        chunks,
        chunkDocMap,
        docTitles,
        isLoading,
        error,
        progress,
        ingestDocuments,
        clearChunks,
        getDocumentTitle
      }}
    >
      {children}
    </ChunkedDocsContext.Provider>
  );
}

export function useChunkedDocs() {
  const context = useContext(ChunkedDocsContext);
  if (!context) {
    throw new Error('useChunkedDocs must be used within a ChunkedDocsProvider');
  }
  return context;
} 