import React, { createContext, useContext, useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';

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

  // Load chat history and threadId from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (stored) {
      setChatHistory(JSON.parse(stored));
    }
    
    // Initialize or load threadId
    const storedThreadId = localStorage.getItem(THREAD_ID_KEY);
    if (storedThreadId) {
      setThreadId(storedThreadId);
    } else {
      const newThreadId = uuidv4();
      setThreadId(newThreadId);
      localStorage.setItem(THREAD_ID_KEY, newThreadId);
    }
  }, []);

  // Persist chat history to localStorage
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(chatHistory));
  }, [chatHistory]);

  // Persist threadId to localStorage
  useEffect(() => {
    if (threadId) {
      localStorage.setItem(THREAD_ID_KEY, threadId);
    }
  }, [threadId]);

  useEffect(() => {
    localStorage.setItem(SHOW_HISTORY_KEY, showHistory);
  }, [showHistory]);

  const handleChatSubmit = async (newQuestion) => {
    if (!newQuestion.trim()) return;

    setIsLoading(true);
    setError(null);
    
    try {
      // Create document list if folder is selected
      const docTitles = selectedFolder?.documents?.map((doc, i) =>
        `${i + 1}. ${doc.title}`
      ).join('\n');

      // Simple docHeader with just the document list and question
      const docHeader = docTitles
        ? `You are answering questions using the following Colorado regulatory documents:\n${docTitles}\n\nPlease use only these documents to answer the following question:\n${newQuestion}`
        : newQuestion;

      // Log the request payload for debugging
      const requestPayload = {
        threadId: threadId,
        question: newQuestion,
        contextPrompt: docHeader
      };
      
      console.log("===== API REQUEST PAYLOAD =====");
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
        throw new Error(`Error: ${response.status}`);
      }

      const data = await response.json();
      setAnswer(data.answer);
      
      // Deduplicate citations by pi_url or title
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

      // Add to chat history and cap at 6 entries
      setChatHistory(prev => {
        const newEntry = {
          question: newQuestion, // Store original question for display
          answer: data.answer,
          citations: uniqueCitations,
          timestamp: new Date().toISOString()
        };

        // Keep the most recent 6 entries (or all if less than 6)
        const limitedHistory = [...prev, newEntry].slice(-6);
        setActiveThreadIndex(limitedHistory.length - 1);
        return limitedHistory;
      });

      // Clear the question input after successful submission
      setQuestion('');
      setLastQuestion(newQuestion);

    } catch (err) {
      setError(err.message || 'Failed to fetch response');
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setQuestion('');
    setAnswer('');
    setCitations([]);
    setError(null);
    // Generate new threadId when clearing chat
    const newThreadId = uuidv4();
    setThreadId(newThreadId);
    localStorage.setItem(THREAD_ID_KEY, newThreadId);
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