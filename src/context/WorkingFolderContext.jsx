import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthContext } from './AuthContext';

const WorkingFolderContext = createContext();
const HARDCODED_USER_ID = "user-abc123"; // Fallback ID if authentication fails

export function WorkingFolderProvider({ children }) {
  const [workingFolderDocs, setWorkingFolderDocs] = useState([]);
  const [folders, setFolders] = useState([]);
  const [currentFolderId, setCurrentFolderId] = useState(null);
  const { user } = useContext(AuthContext); // Get the authenticated user

  // Get the real user ID from Cognito or fall back to hardcoded value
  const getUserId = () => {
    if (user) {
      // Cognito user IDs are stored in the sub attribute
      if (user.attributes && user.attributes.sub) {
        return user.attributes.sub;
      }
      // If for some reason sub isn't there, try username
      if (user.username) {
        return user.username;
      }
    }
    // Fall back to hardcoded ID if no user is found
    console.warn("No authenticated user found, using fallback ID");
    return HARDCODED_USER_ID;
  };

  // Helper function to normalize folder objects
  const normalizeFolder = (folder) => {
    return {
      ...folder,
      folderId: folder.folderId || folder.folder_id || folder.id,
      // Ensure folderName exists (this could be missing in some records)
      name: folder.name || folder.folderName || 'Unnamed Folder',
      documents: folder.documents || []
    };
  };

  // Load folders on component mount
  useEffect(() => {
    console.log("WorkingFolderProvider mounted - initial load of folders");
    loadFolders();
  }, [user]); // Reload when user changes

  const loadFolders = async (userId = null) => {
    // Use provided userId or get it from the authenticated user
    const effectiveUserId = userId || getUserId();
    console.log("loadFolders called with userId:", effectiveUserId);
    
    try {
      const response = await fetch('https://gbgi989gbe.execute-api.us-west-2.amazonaws.com/sbx/folders/list', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: effectiveUserId }),
      });
      
      let data;
      let errorText;
      
      try {
        // Try to get the response as text first
        errorText = await response.text();
        // Then try to parse it as JSON
        data = JSON.parse(errorText);
      } catch (parseError) {
        console.warn("Failed to parse response as JSON:", parseError);
        // If it's not JSON, just use the text
      }
      
      // Handle non-OK responses
      if (!response.ok) {
        console.error("API error in loadFolders:", errorText || response.statusText);
        
        // If error is related to folderName missing (which is the current issue)
        if (errorText && errorText.includes("folderName")) {
          console.warn("Folder name error detected. Using empty folders list instead.");
          // Set an empty folders list to prevent crashes
          setFolders([]);
        } else {
          throw new Error(`Failed to load folders: ${response.status} ${response.statusText}`);
        }
      } else if (data && data.folders) {
        console.log("Setting folders from API:", data.folders);
        // Normalize folders when loading from the backend
        const normalizedFolders = data.folders.map(normalizeFolder);
        setFolders(normalizedFolders);
      } else {
        console.warn("API returned unexpected format - missing 'folders' property:", data);
        // Set empty folders array to avoid undefined errors
        setFolders([]);
      }
    } catch (error) {
      console.error('Error loading folders:', error);
      // Set empty folders array to avoid undefined errors
      setFolders([]);
    }
  };

  const createFolderRemote = async (name, userId = null) => {
    // Use provided userId or get it from the authenticated user
    const effectiveUserId = userId || getUserId();
    console.log("Calling createFolderRemote with name:", name, "and userId:", effectiveUserId);
    
    if (!name || name.trim() === '') {
      console.error("Cannot create folder with empty name");
      return null;
    }
    
    try {
      const requestBody = { 
        userId: effectiveUserId, 
        folderName: name.trim() 
      };
      
      console.log("Sending POST to /folders with body:", JSON.stringify(requestBody));
      
      const response = await fetch('https://gbgi989gbe.execute-api.us-west-2.amazonaws.com/sbx/folders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
      
      // Handle non-OK responses first
      if (!response.ok) {
        const errorText = await response.text();
        console.error("API error:", errorText, "Status:", response.status);
        throw new Error(`Failed to create folder: ${response.status} ${response.statusText}`);
      }
      
      const responseText = await response.text();
      console.log("Raw API response text:", responseText);
      
      // Only try to parse JSON for successful responses with content
      let data;
      try {
        data = responseText ? JSON.parse(responseText) : null;
      } catch (parseError) {
        console.error("Error parsing API response as JSON:", parseError);
        console.log("Raw response that failed parsing:", responseText);
        return null;
      }
      
      console.log("API responded with parsed data:", data);
      
      if (!data) {
        console.error("API returned empty or invalid response");
        return null;
      }
      
      // Create and normalize folder object
      const rawFolder = {
        id: data.folderId,
        name: name.trim(),
        folderName: name.trim(),
        documents: []
      };
      
      const normalizedFolder = normalizeFolder(rawFolder);
      console.log("Creating normalized folder in state:", normalizedFolder);
      setFolders(prev => [...prev, normalizedFolder]);
      return normalizedFolder;
    } catch (error) {
      console.error('Error creating folder remotely:', error);
      // Re-throw the error so caller knows something went wrong
      throw error;
    }
  };

  // Local folder creation now uses the remote API
  const createFolder = async (name) => {
    try {
      // Use the remote API to create the folder
      return await createFolderRemote(name);
    } catch (error) {
      console.error("Failed to create folder remotely, falling back to local creation:", error);
      
      // Fall back to local creation if the API fails
      const rawFolder = {
        id: `local-${Date.now()}`, // Use a special prefix for local folders
        name: name.trim(),
        folderName: name.trim(),
        documents: []
      };
      
      const normalizedFolder = normalizeFolder(rawFolder);
      setFolders(prev => [...prev, normalizedFolder]);
      return normalizedFolder;
    }
  };

  // Function to delete a folder from the backend database
  const deleteFolderRemote = async (folderId, userId = null) => {
    // Use provided userId or get it from the authenticated user
    const effectiveUserId = userId || getUserId();
    console.log("Calling deleteFolderRemote with folderId:", folderId, "and userId:", effectiveUserId);
    
    try {
      const requestBody = { 
        userId: effectiveUserId, 
        folderId: folderId 
      };
      
      console.log("Sending DELETE to /folders with body:", JSON.stringify(requestBody));
      
      const response = await fetch('https://gbgi989gbe.execute-api.us-west-2.amazonaws.com/sbx/folders', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
      
      // Handle non-OK responses
      if (!response.ok) {
        const errorText = await response.text();
        console.error("API error in deleteFolderRemote:", errorText, "Status:", response.status);
        throw new Error(`Failed to delete folder: ${response.status} ${response.statusText}`);
      }
      
      // Parse the response
      const responseText = await response.text();
      console.log("Delete folder API response:", responseText);
      
      let data;
      try {
        data = responseText ? JSON.parse(responseText) : null;
      } catch (parseError) {
        console.error("Error parsing delete response as JSON:", parseError);
        console.log("Raw response that failed parsing:", responseText);
      }
      
      // Update local state by removing the folder
      deleteFolder(folderId);
      
      return true;
    } catch (error) {
      console.error('Error deleting folder remotely:', error);
      
      // Still update local state even if remote deletion fails
      deleteFolder(folderId);
      
      return false;
    }
  };

  // Function to add document to a folder in DynamoDB
  const addToFolderRemote = async (document, folderId, userId = null) => {
    console.log("🔴🔴🔴 addToFolderRemote STARTED 🔴🔴🔴");
    console.log("Document:", document);
    console.log("FolderId:", folderId);
    
    // Check if the document already exists in the target folder
    const targetFolder = folders.find(folder => folder.id === folderId);
    if (targetFolder && targetFolder.documents) {
      const isDuplicate = targetFolder.documents.some(doc =>
        (doc.id && document.id && doc.id === document.id) ||
        (doc.url && document.url && doc.url === document.url) ||
        (doc.title && document.title && doc.title === document.title)
      );
      if (isDuplicate) {
        console.log("🔴🔴🔴 DUPLICATE DOCUMENT: Document already exists in folder 🔴🔴🔴");
        return false; // Return early without making API call
      }
    }
    
    // Use provided userId or get it from the authenticated user
    const effectiveUserId = userId || getUserId();
    
    try {
      // No need to encode the document ID in the URL since this is a POST to the folder endpoint
      const endpoint = `https://gbgi989gbe.execute-api.us-west-2.amazonaws.com/sbx/folders/${folderId}/documents`;
      console.log("🔴🔴🔴 API URL:", endpoint, "🔴🔴🔴");
      
      const requestBody = { 
        userId: effectiveUserId,
        document: {
          id: document.id,
          title: document.title,
          url: document.url,
          description: document.description,
          jurisdiction: document.jurisdiction,
          type: document.type
        }
      };
      
      console.log("🔴🔴🔴 REQUEST:", JSON.stringify(requestBody), "🔴🔴🔴");
      
      console.log("🔴🔴🔴 MAKING FETCH CALL 🔴🔴🔴");
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
      
      console.log("🔴🔴🔴 RESPONSE STATUS:", response.status, "🔴🔴🔴");
      
      // Handle non-OK responses
      if (!response.ok) {
        const errorText = await response.text();
        console.error("🔴🔴🔴 API ERROR:", errorText, "Status:", response.status, "🔴🔴🔴");
        throw new Error(`Failed to add document to folder: ${response.status} ${response.statusText}`);
      }
      
      // Get response body
      const responseText = await response.text();
      console.log("🔴🔴🔴 RESPONSE BODY:", responseText, "🔴🔴🔴");
      
      // Add to local state
      console.log("🔴🔴🔴 UPDATING LOCAL STATE 🔴🔴🔴");
      addToFolder(document, folderId);
      
      console.log("🔴🔴🔴 addToFolderRemote COMPLETED SUCCESSFULLY 🔴🔴🔴");
      return true;
    } catch (error) {
      console.error("🔴🔴🔴 ERROR IN addToFolderRemote:", error.message, "🔴🔴🔴");
      
      // Still update local state even if remote addition fails
      addToFolder(document, folderId);
      
      return false;
    }
  };

  // Function to remove a document from a folder in DynamoDB
  const removeFromFolderRemote = async (documentId, folderId, userId = null) => {
    console.log("🟣🟣🟣 removeFromFolderRemote STARTED 🟣🟣🟣");
    console.log("DocumentId:", documentId);
    console.log("FolderId:", folderId);
    
    // Use provided userId or get it from the authenticated user
    const effectiveUserId = userId || getUserId();
    
    try {
      // Use btoa (Base64 encoding) for document ID to avoid URL path issues
      const encodedDocId = btoa(documentId);
      const endpoint = `https://gbgi989gbe.execute-api.us-west-2.amazonaws.com/sbx/folders/${folderId}/documents/${encodedDocId}`;
      console.log("🟣🟣🟣 API URL:", endpoint, "🟣🟣🟣");
      
      const requestBody = { 
        userId: effectiveUserId
      };
      
      console.log("🟣🟣🟣 REQUEST:", JSON.stringify(requestBody), "🟣🟣🟣");
      
      console.log("🟣🟣🟣 MAKING FETCH CALL 🟣🟣🟣");
      const response = await fetch(endpoint, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
      
      console.log("🟣🟣🟣 RESPONSE STATUS:", response.status, "🟣🟣🟣");
      
      // Handle non-OK responses
      if (!response.ok) {
        const errorText = await response.text();
        console.error("🟣🟣🟣 API ERROR:", errorText, "Status:", response.status, "🟣🟣🟣");
        throw new Error(`Failed to remove document from folder: ${response.status} ${response.statusText}`);
      }
      
      // Get response body
      const responseText = await response.text();
      console.log("🟣🟣🟣 RESPONSE BODY:", responseText, "🟣🟣🟣");
      
      // Update local state
      console.log("🟣🟣🟣 UPDATING LOCAL STATE 🟣🟣🟣");
      removeFromFolder(documentId, folderId);
      
      console.log("🟣🟣🟣 removeFromFolderRemote COMPLETED SUCCESSFULLY 🟣🟣🟣");
      return true;
    } catch (error) {
      console.error("🟣🟣🟣 ERROR IN removeFromFolderRemote:", error.message, "🟣🟣🟣");
      
      // Still update local state even if remote removal fails
      removeFromFolder(documentId, folderId);
      
      return false;
    }
  };

  const addToWorkingFolder = (document) => {
    console.log('Adding document to working folder:', document);
    
    setWorkingFolderDocs(prev => {
      // Check if document already exists
      const exists = prev.some(doc => doc.id === document.id);
      if (exists) {
        console.log('Document already exists in working folder');
        return prev;
      }
      
      // Add new document
      return [...prev, document];
    });
  };

  const removeFromWorkingFolder = (documentId) => {
    console.log('Removing document from working folder:', documentId);
    
    setWorkingFolderDocs(prev => 
      prev.filter(doc => doc.id !== documentId)
    );
  };

  const moveToFolder = (documentId, folderId) => {
    // Remove from working folder
    setWorkingFolderDocs(prev => prev.filter(doc => doc.id !== documentId));

    // Remove from all folders and add to the target folder
    setFolders(prev => {
      // Find the document in any folder or workingFolderDocs
      let doc = workingFolderDocs.find(d => d.id === documentId);
      if (!doc) {
        for (const folder of prev) {
          const found = folder.documents.find(d => d.id === documentId);
          if (found) {
            doc = found;
            break;
          }
        }
      }
      if (!doc) return prev; // If not found, do nothing

      return prev.map(folder => {
        // Remove from all folders
        let newDocs = folder.documents.filter(d => d.id !== documentId);
        // Add to target folder if not already present
        if (folder.id === folderId && !folder.documents.some(d => d.id === documentId)) {
          newDocs = [...newDocs, doc];
        }
        return { ...folder, documents: newDocs };
      });
    });
  };

  const removeFromFolder = (documentId, folderId) => {
    setFolders(prev => prev.map(folder => {
      if (folder.id === folderId) {
        return {
          ...folder,
          documents: folder.documents.filter(doc => doc.id !== documentId)
        };
      }
      return folder;
    }));
  };

  const deleteFolder = (folderId) => {
    setFolders(prev => prev.filter(f => f.id !== folderId));
  };

  const addToFolder = (document, folderId) => {
    setFolders(prev => prev.map(folder => {
      if (folder.id === folderId) {
        // Prevent duplicates
        if (!folder.documents.some(doc => doc.id === document.id)) {
          return {
            ...folder,
            documents: [...folder.documents, document]
          };
        }
      }
      return folder;
    }));
  };

  const renameFolder = (folderId, newName) => {
    setFolders(prev => prev.map(folder =>
      folder.id === folderId ? { ...folder, name: newName } : folder
    ));
  };

  // Function to rename a folder in the backend
  const renameFolderRemote = async (folderId, newName, userId = null) => {
    console.log("🔵🔵🔵 renameFolderRemote STARTED 🔵🔵🔵");
    console.log("FolderId:", folderId);
    console.log("New Name:", newName);
    
    // Use provided userId or get it from the authenticated user
    const effectiveUserId = userId || getUserId();
    
    try {
      const endpoint = `https://gbgi989gbe.execute-api.us-west-2.amazonaws.com/sbx/folders/${folderId}`;
      console.log("🔵🔵🔵 API URL:", endpoint, "🔵🔵🔵");
      
      const requestBody = { 
        userId: effectiveUserId,
        newName: newName
      };
      
      console.log("🔵🔵🔵 REQUEST:", JSON.stringify(requestBody), "🔵🔵🔵");
      
      console.log("🔵🔵🔵 MAKING FETCH CALL 🔵🔵🔵");
      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
      
      console.log("🔵🔵🔵 RESPONSE STATUS:", response.status, "🔵🔵🔵");
      
      // Handle non-OK responses
      if (!response.ok) {
        const errorText = await response.text();
        console.error("🔵🔵🔵 API ERROR:", errorText, "Status:", response.status, "🔵🔵🔵");
        throw new Error(`Failed to rename folder: ${response.status} ${response.statusText}`);
      }
      
      // Get response body
      const responseText = await response.text();
      console.log("🔵🔵🔵 RESPONSE BODY:", responseText, "🔵🔵🔵");
      
      // Update local state
      console.log("🔵🔵🔵 UPDATING LOCAL STATE 🔵🔵🔵");
      renameFolder(folderId, newName);
      
      console.log("🔵🔵🔵 renameFolderRemote COMPLETED SUCCESSFULLY 🔵🔵🔵");
      return true;
    } catch (error) {
      console.error("🔵🔵🔵 ERROR IN renameFolderRemote:", error.message, "🔵🔵🔵");
      
      // Still update local state even if remote rename fails
      renameFolder(folderId, newName);
      
      return false;
    }
  };

  return (
    <WorkingFolderContext.Provider 
      value={{ 
        workingFolderDocs, 
        addToWorkingFolder, 
        removeFromWorkingFolder,
        folders,
        createFolder,
        createFolderRemote,
        loadFolders,
        moveToFolder,
        removeFromFolder,
        removeFromFolderRemote,
        deleteFolder,
        deleteFolderRemote,
        currentFolderId,
        setCurrentFolderId,
        addToFolder,
        addToFolderRemote,
        renameFolder,
        renameFolderRemote,
        getUserId // Expose the utility function for other components
      }}
    >
      {children}
    </WorkingFolderContext.Provider>
  );
}

export function useWorkingFolder() {
  const context = useContext(WorkingFolderContext);
  if (!context) {
    throw new Error('useWorkingFolder must be used within a WorkingFolderProvider');
  }
  return context;
} 