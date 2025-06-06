import React, { createContext, useContext, useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { AuthContext } from './AuthContext';

export const ChatContext = createContext();

const LOCAL_STORAGE_KEY = 'copilotChatHistory';
const THREAD_ID_KEY = 'copilotThreadId';
const SHOW_HISTORY_KEY = 'copilotShowHistory';
const BASE_URL = 'https://gbgi989gbe.execute-api.us-west-2.amazonaws.com/sbx';

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

  const buildContextPrompt = () => {
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

    return docHeaderParts.join('\n\n');
  };

  const handleChatSubmit = async (newQuestion) => {
    // Validate question
    if (!newQuestion.trim()) {
      alert('Please enter a question before submitting.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const userId = user?.username || user?.userId || 'anonymous';
      const hasFolderDocs = selectedFolder?.documents?.length > 0;

      if (hasFolderDocs) {
        // Use chat-with-docs Lambda for folder-specific chat
        if (!selectedFolder.folderId) {
          throw new Error('Selected folder is missing folderId');
        }

        console.log("===== FOLDER CHAT WITH DOCS API REQUEST =====");
        console.log("User ID:", userId);
        console.log("Folder ID:", selectedFolder.folderId);
        console.log("Question:", newQuestion);
        console.log("==============================================");

        const response = await fetch(`${BASE_URL}/chat-with-docs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            folderId: selectedFolder.folderId,
            question: newQuestion
          }),
        });

        if (!response.ok) {
          throw new Error(`Error: ${response.status} - Failed to get response from folder chat`);
        }

        const data = await response.json();
        
        if (!data.answer) {
          throw new Error('Invalid response format: missing answer');
        }

        // Format sources with proper metadata for display in source panel
        const sourceMetadata = (data.sources || []).map((s) => ({
          title: s.title || 'Untitled Document',
          jurisdiction: s.jurisdiction || 'Unknown',
          s3Path: s.s3Path || '',
          // Keep original source data for compatibility
          ...s
        }));

        setAnswer(data.answer);
        setCitations(sourceMetadata);

        const newEntry = {
          question: newQuestion,
          answer: data.answer,
          citations: sourceMetadata,
          timestamp: new Date().toISOString(),
          mode: 'folder-chat'
        };
        
        // Update history and UI
        setChatHistory(prev => [...prev.slice(-5), newEntry]);
        setActiveThreadIndex(chatHistory.length);

      } else {
        // Use general KB chat mode
        console.log("===== KB CHAT API REQUEST =====");
        console.log("Thread ID:", threadId);
        console.log("Question:", newQuestion);
        console.log("Context Prompt:", buildContextPrompt());
        console.log("===============================");

        const response = await fetch(`${BASE_URL}/kb-chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            threadId: threadId,
            question: newQuestion,
            contextPrompt: buildContextPrompt()
          }),
        });

        if (!response.ok) {
          throw new Error(`Error: ${response.status} - Failed to get response from knowledge base`);
        }

        const data = await response.json();
        
        if (!data.answer) {
          throw new Error('Invalid response format: missing answer');
        }

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

        setAnswer(data.answer);
        setCitations(uniqueCitations);

        const newEntry = {
          question: newQuestion,
          answer: data.answer,
          citations: uniqueCitations,
          timestamp: new Date().toISOString(),
          mode: 'knowledge-base'
        };
        
        setChatHistory(prev => [...prev.slice(-5), newEntry]);
        setActiveThreadIndex(chatHistory.length);
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
