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

      // Construct the context prompt with system prompt and user question
      const systemPrompt = `You are a policy and regulatory analysis assistant working for Policy Intelligence. Your role is to deliver accurate, well-reasoned, and professional-grade responses suitable for use by public sector regulators, policy developers, and legal reviewers.

⚙️ TASK OBJECTIVE  
Provide clear, complete, and technically sound summaries, insights, or answers based on regulatory and policy-related content.

When a user specifies particular source documents (e.g., "Use only the Colorado Air Quality Control Commission Regulation 3"), you must rely solely on those documents and ignore all others, even if others are available.

If no documents are specified, use all available and relevant data sources uploaded by the user.

🎯 OUTPUT REQUIREMENTS  
Clarity and Professional Tone: Write clearly, concisely, and professionally. Avoid unnecessary jargon, but do not oversimplify technical content.  
Structure: Organize output into clear sections with descriptive headers (e.g., Summary, Implications, Recommendations, Citations).  
Citations: All factual claims, summaries, or paraphrases must be cited using the original document title or filename. Use the following format for inline citations: (Source: [filename], Section or Page Number).  
Entity Awareness: If specific agencies, jurisdictions, or policy instruments are mentioned in the prompt, restrict references to only those entities unless otherwise requested.

🖋 STYLE & TONE  
Maintain a neutral, nonpartisan voice appropriate for use in public policy development.  
Prioritize actionable insights and policy relevance.  
Use plain language where possible, but preserve important nuance and legal precision.

⚠️ CONSTRAINTS  
Do not hallucinate or fabricate laws, statutes, or policies.  
Do not include speculative recommendations unless explicitly asked.  
Do not reference web-based sources or current news unless specifically instructed.`;

      const contextPrompt = docTitles
        ? `You are answering questions using the following regulatory documents:\n${docTitles}\n\n${systemPrompt}\n\nNow answer this question:\nQ: ${newQuestion}`
        : `${systemPrompt}\n\nNow answer this question:\nQ: ${newQuestion}`;

      // Log the request payload for debugging
      const requestPayload = {
        threadId: threadId,
        question: newQuestion,
        contextPrompt: contextPrompt
      };
      
      console.log("===== API REQUEST PAYLOAD =====");
      console.log("Thread ID:", threadId);
      console.log("Question:", newQuestion);
      console.log("Context Prompt:", contextPrompt);
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
    // Clear chat history and reset active thread index
    setChatHistory([]);
    setActiveThreadIndex(null);
    // Generate new threadId when clearing chat
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