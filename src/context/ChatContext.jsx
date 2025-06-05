import React, { createContext, useContext, useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { AuthContext } from './AuthContext';

export const ChatContext = createContext();

const LOCAL_STORAGE_KEY = 'copilotChatHistory';
const THREAD_ID_KEY = 'copilotThreadId';
const SHOW_HISTORY_KEY = 'copilotShowHistory';

export const ChatProvider = ({ children }) => {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [citations, setCitations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [activeThreadIndex, setActiveThreadIndex] = useState(null);
  const [lastQuestion, setLastQuestion] = useState('');
  const [threadId, setThreadId] = useState('');
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [showHistory, setShowHistory] = useState(() => {
    const stored = localStorage.getItem(SHOW_HISTORY_KEY);
    return stored === null ? false : stored === 'true';
  });

  // Get user from AuthContext for folder chat mode
  const { user } = useContext(AuthContext);

  useEffect(() => {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (stored) {
      setChatHistory(JSON.parse(stored));
    }

    const storedThreadId = localStorage.getItem(THREAD_ID_KEY);
    if (storedThreadId) {
      setThreadId(storedThreadId);
    } else {
      const newThreadId = uuidv4();
      setThreadId(newThreadId);
      localStorage.setItem(THREAD_ID_KEY, newThreadId);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(chatHistory));
  }, [chatHistory]);

  useEffect(() => {
    if (threadId) {
      localStorage.setItem(THREAD_ID_KEY, threadId);
    }
  }, [threadId]);

  useEffect(() => {
    localStorage.setItem(SHOW_HISTORY_KEY, showHistory);
  }, [showHistory]);

  const handleChatSubmit = async (newQuestion) => {
    // Validate question
    if (!newQuestion.trim()) {
      alert('Please enter a question before submitting.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Check if we're in folder chat mode
      const isFolderMode = selectedFolder && 
                          Array.isArray(selectedFolder.documents) && 
                          selectedFolder.documents.length > 0;

      if (isFolderMode) {
        // Folder Chat Mode: Use custom RAG system
        if (!selectedFolder.folderId) {
          throw new Error('Selected folder is missing folderId');
        }

        const userId = user?.username || user?.userId || 'anonymous';
        
        const requestPayload = {
          userId: userId,
          folderId: selectedFolder.folderId,
          question: newQuestion
        };

        console.log("===== FOLDER CHAT API REQUEST =====");
        console.log("User ID:", userId);
        console.log("Folder ID:", selectedFolder.folderId);
        console.log("Question:", newQuestion);
        console.log("Full payload:", requestPayload);
        console.log("====================================");

        const response = await fetch('https://gbgi989gbe.execute-api.us-west-2.amazonaws.com/sbx/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestPayload),
        });

        if (!response.ok) {
          throw new Error(`Error: ${response.status} - Failed to get response from folder chat`);
        }

        const data = await response.json();
        
        // Handle folder chat response format
        if (!data.answer) {
          throw new Error('Invalid response format: missing answer');
        }

        // Combine answer with sources
        let fullAnswer = data.answer;
        if (data.sources && Array.isArray(data.sources) && data.sources.length > 0) {
          fullAnswer += `\n\nSources: ${data.sources.join(', ')}`;
        }

        setAnswer(fullAnswer);
        setCitations([]); // Folder mode doesn't use citations array

        // Add to chat history
        setChatHistory(prev => {
          const newEntry = {
            question: newQuestion,
            answer: fullAnswer,
            citations: [],
            timestamp: new Date().toISOString(),
            mode: 'folder' // Track which mode was used
          };

          const limitedHistory = [...prev, newEntry].slice(-6);
          setActiveThreadIndex(limitedHistory.length - 1);
          return limitedHistory;
        });

      } else {
        // Check if no folder selected but user expected folder mode
        if (selectedFolder && (!selectedFolder.documents || selectedFolder.documents.length === 0)) {
          alert('The selected folder contains no documents. Please select a folder with documents or switch to general chat mode.');
          setIsLoading(false);
          return;
        }

        // General Chat Mode: Use existing Bedrock Knowledge Base
        const recentHistory = chatHistory
          .map(entry => `User: ${entry.question}\nAssistant: ${entry.answer}`)
          .join('\n\n');

        const docTitles = selectedFolder?.documents?.map((doc, i) =>
          `${i + 1}. ${doc.title}`
        ).join('\n');

        const docHeaderParts = [];

        docHeaderParts.push(
          `You are a regulatory policy assistant helping users understand air quality rules and emissions requirements.\n` +
          `Use only the following documents to answer questions${selectedFolder ? ' about ' + selectedFolder.name : ''}:`
        );

        if (docTitles) {
          docHeaderParts.push(`${docTitles}`);
        }

        if (recentHistory) {
          docHeaderParts.push(`The conversation so far:\n${recentHistory}`);
        }

        docHeaderParts.push(`User: ${newQuestion}`);

        const docHeader = docHeaderParts.join('\n\n');

        const requestPayload = {
          threadId: threadId,
          question: newQuestion,
          contextPrompt: docHeader // Fixed: was using undefined contextPrompt
        };

        console.log("===== KB CHAT API REQUEST =====");
        console.log("Thread ID:", threadId);
        console.log("Question:", newQuestion);
        console.log("Context Prompt:", docHeader);
        console.log("Full payload:", requestPayload);
        console.log("===============================");

        const response = await fetch('https://gbgi989gbe.execute-api.us-west-2.amazonaws.com/sbx/kb-chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestPayload),
        });

        if (!response.ok) {
          throw new Error(`Error: ${response.status} - Failed to get response from knowledge base`);
        }

        const data = await response.json();
        setAnswer(data.answer);

        const uniqueCitations = [];
        const seenUrls = new Set();

        if (data.citations && data.citations.length > 0) {
          data.citations.forEach(citation => {
            const uniqueId = citation.pi_url || citation.title;
            if (!seenUrls.has(uniqueId)) {
              seenUrls.add(uniqueId);
              uniqueCitations.push(citation);
            }
          });
        }

        setCitations(uniqueCitations);

        // Add to chat history
        setChatHistory(prev => {
          const newEntry = {
            question: newQuestion,
            answer: data.answer,
            citations: uniqueCitations,
            timestamp: new Date().toISOString(),
            mode: 'knowledge-base' // Track which mode was used
          };

          const limitedHistory = [...prev, newEntry].slice(-6);
          setActiveThreadIndex(limitedHistory.length - 1);
          return limitedHistory;
        });
      }

      setQuestion('');
      setLastQuestion(newQuestion);

    } catch (err) {
      console.error('Chat submission error:', err);
      const friendlyMessage = err.message || 'Failed to get response. Please try again.';
      setError(friendlyMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setQuestion('');
    setAnswer('');
    setCitations([]);
    setError(null);
    const newThreadId = uuidv4();
    setThreadId(newThreadId);
    localStorage.setItem(THREAD_ID_KEY, newThreadId);
    // Also clear the chat history in localStorage
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify([]));
  };

  return (
    <ChatContext.Provider value={{
      question,
      setQuestion,
      answer,
      setAnswer,
      citations,
      setCitations,
      isLoading,
      error,
      chatHistory,
      setChatHistory,
      activeThreadIndex,
      setActiveThreadIndex,
      handleChatSubmit,
      clearChat,
      lastQuestion,
      setLastQuestion,
      threadId,
      selectedFolder,
      setSelectedFolder,
      showHistory,
      setShowHistory
    }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
