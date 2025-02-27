import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { useNetwork } from './NetworkContext';
import { toast } from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';

const ChatContext = createContext();
const STORAGE_KEY = 'llmule_conversations';
const CONFIG_STORAGE_KEY = 'llmule_chat_config';

const DEFAULT_CONFIG = {
  systemPrompt: '',
  temperature: 0.7,
  maxTokens: 4096
};

export function ChatProvider({ children }) {
  const [conversations, setConversations] = useState([]);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [chatConfig, setChatConfig] = useState(DEFAULT_CONFIG);
  const [currentRequestId, setCurrentRequestId] = useState(null);
  const { networkModels, localModels } = useNetwork();

  // Load chat configuration from localStorage
  useEffect(() => {
    try {
      const storedConfig = localStorage.getItem(CONFIG_STORAGE_KEY);
      if (storedConfig) {
        setChatConfig(JSON.parse(storedConfig));
      }
    } catch (error) {
      console.error('Failed to load chat configuration:', error);
    }
  }, []);

  // Save chat configuration to localStorage
  const updateChatConfig = (newConfig) => {
    setChatConfig(newConfig);
    try {
      localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(newConfig));
    } catch (error) {
      console.error('Failed to save chat configuration:', error);
    }
  };

  // Load conversations from local storage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Validate stored data
        const validConversations = parsed.filter(conv => 
          conv && conv.id && conv.modelId && Array.isArray(conv.messages)
        );
        setConversations(validConversations);
        // Set the most recent conversation as current if exists
        if (validConversations.length > 0) {
          setCurrentConversation(validConversations[0]);
        }
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
      toast.error('Failed to load previous conversations');
    }
  }, []);

  // Function to save conversations to local storage
  const saveConversations = async () => {
    setIsSaving(true);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
    } catch (error) {
      console.error('Failed to save conversations:', error);
      toast.error('Failed to save conversation changes');
    } finally {
      setIsSaving(false);
    }
  };

  // Save conversations to local storage with debounce
  useEffect(() => {
    if (conversations.length === 0) return;
    
    const timeoutId = setTimeout(saveConversations, 500);
    return () => clearTimeout(timeoutId);
  }, [conversations]);

  const createNewConversation = async (modelId, initialMessages = []) => {
    const newConversation = {
      id: crypto.randomUUID(),
      modelId,
      messages: initialMessages,
      title: 'New Conversation',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      // Update state with new conversation at the beginning of the list
      setConversations(prev => [newConversation, ...prev]);
      setCurrentConversation(newConversation);
      return newConversation;
    } catch (error) {
      console.error('Failed to create new conversation:', error);
      throw error;
    }
  };

  const updateConversation = (conversationId, updates) => {
    setConversations(prev => prev.map(conv => 
      conv.id === conversationId 
        ? { ...conv, ...updates, updatedAt: new Date().toISOString() }
        : conv
    ));
  };

  const updateConversationTitle = (conversationId, newTitle) => {
    const conversation = conversations.find(c => c.id === conversationId);
    if (!conversation) return;

    const updatedConversation = {
      ...conversation,
      title: newTitle,
      updatedAt: new Date().toISOString()
    };

    setConversations(prev => [
      updatedConversation,
      ...prev.filter(c => c.id !== conversationId)
    ]);
    setCurrentConversation(updatedConversation);
  };

  // Helper function to check if a model or tier is available
  const checkModelAvailability = (modelId) => {
    // Check if it's a tier
    const tiers = ['xs', 'small', 'medium', 'large', 'xl', 'xxl'];
    if (tiers.includes(modelId)) {
      // For tiers, check if there are any models of that tier available
      const hasTierModels = networkModels.some(m => m.tier === modelId);
      return {
        isAvailable: hasTierModels,
        message: hasTierModels ? null : `No models available for tier ${modelId} at this time. Please select another model.`
      };
    }

    // Check if it's a specific model
    const modelExists = networkModels.some(m => m.id === modelId) || 
                       localModels.some(m => m.name === modelId || m.id === modelId);
    
    return {
      isAvailable: modelExists,
      message: modelExists ? null : `Model ${modelId} isn't available at this time. Please select another model.`
    };
  };

  const sendMessage = async (content, modelId, conversationId = null, existingConversation = null) => {
    console.log('SendMessage - Initial state:', { content, modelId, conversationId });
    
    if (!networkModels.length && !localModels.length) {
      toast.error('No models available');
      return;
    }

    // Check model availability
    const { isAvailable, message } = checkModelAvailability(modelId);
    if (!isAvailable) {
      toast.error(message);
      return;
    }
  
    let conversation;
    let requestError = null;
    const requestId = Date.now().toString();
    setCurrentRequestId(requestId);
    
    try {
      const userMessage = { 
        role: 'user', 
        content, 
        timestamp: new Date().toISOString() 
      };
  
      if (existingConversation) {
        conversation = existingConversation;
      } else if (!conversationId) {
        conversation = {
          id: crypto.randomUUID(),
          modelId,
          messages: [userMessage],
          title: content.slice(0, 30) + (content.length > 30 ? '...' : ''),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      } else {
        conversation = { ...currentConversation };
        // Don't modify messages if regenerating
        if (!conversation.messages.some(m => m.content === content && m.role === 'user')) {
          conversation.messages = [...conversation.messages, userMessage];
          // Update title if this is the first message
          if (conversation.messages.length === 1) {
            conversation.title = content.slice(0, 30) + (content.length > 30 ? '...' : '');
          }
        }
      }
  
      conversation.isThinking = true;
      
      setConversations(prev => [conversation, ...prev.filter(c => c.id !== conversation.id)]);
      setCurrentConversation(conversation);
      setIsLoading(true);
  
      // Prepare messages for the API call
      let messagesToSend = [...conversation.messages];
      
      // If we're regenerating (existingConversation exists), we need to find the last user message
      if (existingConversation) {
        const lastUserMessageIndex = messagesToSend.length - 1;
        messagesToSend = messagesToSend.slice(0, lastUserMessageIndex + 1);
      }
      
      // Add system prompt if configured
      if (chatConfig.systemPrompt) {
        messagesToSend = [{ role: 'system', content: chatConfig.systemPrompt }, ...messagesToSend];
      }
      
      console.log('Sending messages to LLM:', messagesToSend);
  
      try {
        const response = await window.electron.llm.chat({
          model: modelId,
          messages: messagesToSend,
          temperature: chatConfig.temperature,
          max_tokens: chatConfig.maxTokens,
          type: localModels.find(m => m.name === modelId || m.id === modelId)?.type,
          isLocal: localModels.some(m => m.name === modelId || m.id === modelId),
          requestId
        });
        
        if (!response?.content) throw new Error('Invalid response');
    
        // Keep all existing messages and add the assistant's response
        conversation.messages = [
          ...conversation.messages,
          { role: 'assistant', content: response.content, timestamp: new Date().toISOString() }
        ];
        conversation.isThinking = false;
        conversation.updatedAt = new Date().toISOString();
    
        setConversations(prev => [conversation, ...prev.filter(c => c.id !== conversation.id)]);
        setCurrentConversation(conversation);
      } catch (error) {
        // Handle specific error from the electron process
        console.error('Model inference error:', error);
        
        // Format the error message for display
        let errorMessage = 'An error occurred while generating a response';
        
        if (error instanceof Error) {
          errorMessage = error.message;
        } else if (typeof error === 'string') {
          errorMessage = error;
        } else if (typeof error === 'object') {
          // Try to extract a message from the error object
          errorMessage = error.message || error.error || JSON.stringify(error);
        }
        
        // Add the error message to the conversation
        conversation.messages = [
          ...conversation.messages,
          { 
            role: 'assistant', 
            content: `**Error:** ${errorMessage}`, 
            timestamp: new Date().toISOString(),
            isError: true
          }
        ];
        conversation.isThinking = false;
        conversation.updatedAt = new Date().toISOString();
        
        setConversations(prev => [conversation, ...prev.filter(c => c.id !== conversation.id)]);
        setCurrentConversation(conversation);
        
        // Re-throw the error for the UI to handle
        throw new Error(errorMessage);
      }
    } catch (error) {
      requestError = error;
      const isCancelled = error.message?.includes('Request cancelled by user');
      console.error('Model inference failed:', error);
      
      if (conversation) {
        // Only update conversation state if it wasn't a cancellation
        if (!isCancelled) {
          conversation.isThinking = false;
          setConversations(prev => [conversation, ...prev.filter(c => c.id !== conversation.id)]);
          setCurrentConversation(conversation);
        }
      }
      
      // Re-throw the error for the UI to handle
      throw error;
    } finally {
      // Always set isLoading to false, regardless of whether there was an error
      setIsLoading(false);
      setCurrentRequestId(null);
      
      // Save conversations to local storage
      saveConversations();
    }
  };

  const cancelCurrentRequest = async () => {
    if (currentRequestId) {
      try {
        await window.electron.llm.cancel(currentRequestId);
        
        // Update conversation state
        if (currentConversation) {
          const updatedConversation = {
            ...currentConversation,
            isThinking: false,
            updatedAt: new Date().toISOString()
          };
          
          // Remove the last user message since it was cancelled
          if (updatedConversation.messages.length > 0 && 
              updatedConversation.messages[updatedConversation.messages.length - 1].role === 'user') {
            updatedConversation.messages = updatedConversation.messages.slice(0, -1);
          }
          
          setConversations(prev => [
            updatedConversation,
            ...prev.filter(c => c.id !== currentConversation.id)
          ]);
          setCurrentConversation(updatedConversation);
        }
        
        setIsLoading(false);
        setCurrentRequestId(null);
        toast.success('Generation cancelled');
      } catch (error) {
        console.error('Failed to cancel request:', error);
        toast.error('Failed to cancel request');
      }
    }
  };

  const deleteConversation = (conversationId) => {
    setConversations(prev => {
      const newConversations = prev.filter(c => c.id !== conversationId);
      // If we're deleting the current conversation, switch to the most recent one
      if (currentConversation?.id === conversationId) {
        setCurrentConversation(newConversations[0] || null);
      }
      return newConversations;
    });
  };

  const changeConversationModel = (conversationId, newModelId) => {
    // Check if model exists in either local or network models
    const modelExists = networkModels.some(m => m.id === newModelId) || 
                       localModels.some(m => m.name === newModelId || m.id === newModelId) ||
                       ['xs', 'small', 'medium', 'large', 'xl', 'xxl'].includes(newModelId);
                       
    if (!modelExists) {
      toast.error('Invalid model selected');
      return;
    }

    // Update conversation with new model
    const updatedConversation = {
      ...conversations.find(c => c.id === conversationId),
      modelId: newModelId,
      updatedAt: new Date().toISOString()
    };

    // Move conversation to top and update it
    setConversations(prev => [
      updatedConversation,
      ...prev.filter(c => c.id !== conversationId)
    ]);

    // Update current conversation
    setCurrentConversation(updatedConversation);

    // Show feedback
    toast.success(`Switched to model: ${newModelId}`);
  };

  const deleteMessage = (conversationId, messageIndex) => {
    const conversation = conversations.find(c => c.id === conversationId);
    if (!conversation) return;

    const updatedMessages = [...conversation.messages];
    updatedMessages.splice(messageIndex, 1);

    const updatedConversation = {
      ...conversation,
      messages: updatedMessages,
      updatedAt: new Date().toISOString()
    };

    setConversations(prev => [
      updatedConversation,
      ...prev.filter(c => c.id !== conversationId)
    ]);
    setCurrentConversation(updatedConversation);
  };

  const editMessage = (conversationId, messageIndex, newContent, shouldRegenerate = false) => {
    const conversation = conversations.find(c => c.id === conversationId);
    if (!conversation) return;

    let updatedMessages = [...conversation.messages];
    updatedMessages[messageIndex] = {
      ...updatedMessages[messageIndex],
      content: newContent,
      edited: true,
      editedAt: new Date().toISOString()
    };

    // If shouldRegenerate is true, remove all subsequent messages
    if (shouldRegenerate) {
      updatedMessages = updatedMessages.slice(0, messageIndex + 1);
    }

    const updatedConversation = {
      ...conversation,
      messages: updatedMessages,
      updatedAt: new Date().toISOString(),
      // Set isThinking to true if we're going to regenerate
      isThinking: shouldRegenerate
    };

    setConversations(prev => [
      updatedConversation,
      ...prev.filter(c => c.id !== conversationId)
    ]);
    setCurrentConversation(updatedConversation);

    // If shouldRegenerate is true, regenerate the response
    if (shouldRegenerate) {
      // Only regenerate if the edited message is from a user
      if (updatedMessages[messageIndex].role === 'user') {
        sendMessage(newContent, conversation.modelId, conversationId, updatedConversation);
      } else {
        // If it's an assistant message, find the last user message before this point
        let userMessageIndex = messageIndex - 1;
        while (userMessageIndex >= 0 && updatedMessages[userMessageIndex].role !== 'user') {
          userMessageIndex--;
        }
        
        if (userMessageIndex >= 0) {
          const userMessage = updatedMessages[userMessageIndex];
          sendMessage(userMessage.content, conversation.modelId, conversationId, updatedConversation);
        } else {
          // If no user message found, just update the conversation without regenerating
          updatedConversation.isThinking = false;
          setConversations(prev => [
            updatedConversation,
            ...prev.filter(c => c.id !== conversationId)
          ]);
          setCurrentConversation(updatedConversation);
          toast.error('No user message found to regenerate response');
        }
      }
    }
  };

  const regenerateResponse = async (messageIndex) => {
    if (!networkModels.length && !localModels.length) {
      toast.error('No models available');
      return;
    }

    const conversation = conversations.find(c => c.id === currentConversation.id);
    if (!conversation) return;
  
    try {
      let userMessageIndex = messageIndex;

      // If this is an assistant message, find the last user message before this point
      if (conversation.messages[messageIndex].role === 'assistant') {
        userMessageIndex = messageIndex - 1;
        while (userMessageIndex >= 0 && conversation.messages[userMessageIndex].role !== 'user') {
          userMessageIndex--;
        }
      }

      if (userMessageIndex === -1) {
        toast.error('No user message found to regenerate response');
        return;
      }

      console.log('Regenerating from user message at index:', userMessageIndex);

      // Keep all messages up to and including the user message
      const updatedMessages = conversation.messages.slice(0, userMessageIndex + 1);
      console.log('Messages to keep:', updatedMessages);

      const updatedConversation = {
        ...conversation,
        messages: updatedMessages,
        isThinking: true,
        updatedAt: new Date().toISOString()
      };

      setConversations(prev => [
        updatedConversation,
        ...prev.filter(c => c.id !== conversation.id)
      ]);
      setCurrentConversation(updatedConversation);

      const userMessage = conversation.messages[userMessageIndex];
      console.log('Regenerating response for message:', userMessage);
  
      await sendMessage(userMessage.content, currentConversation.modelId, currentConversation.id, updatedConversation);
    } catch (error) {
      console.error('Failed to regenerate:', error);
      toast.error('Failed to regenerate response');
    }
  };

  const value = {
    conversations,
    currentConversation,
    setCurrentConversation,
    setConversations,
    availableModels: networkModels,
    createNewConversation,
    deleteConversation,
    sendMessage,
    changeConversationModel,
    isLoading,
    isSaving,
    deleteMessage,
    editMessage,
    updateConversationTitle,
    regenerateResponse,
    chatConfig,
    updateChatConfig,
    cancelCurrentRequest
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
} 