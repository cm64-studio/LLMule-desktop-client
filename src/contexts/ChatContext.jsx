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

  // Save conversations to local storage with debounce
  useEffect(() => {
    if (conversations.length === 0) return;
    
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
    console.log('Current conversation:', currentConversation);
    
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
  
      const messages = chatConfig.systemPrompt ? 
        [{ role: 'system', content: chatConfig.systemPrompt }, ...conversation.messages] :
        conversation.messages;
  
      const response = await window.electron.llm.chat({
        model: modelId,
        messages,
        temperature: chatConfig.temperature,
        max_tokens: chatConfig.maxTokens,
        type: localModels.find(m => m.name === modelId || m.id === modelId)?.type,
        isLocal: localModels.some(m => m.name === modelId || m.id === modelId)
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
      console.error('Model inference failed:', error);
      if (conversation) {
        conversation.isThinking = false;
        setConversations(prev => [conversation, ...prev.filter(c => c.id !== conversation.id)]);
        setCurrentConversation(conversation);
      }
      throw error;
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

    // Si shouldRegenerate es true, eliminar mensajes posteriores
    if (shouldRegenerate) {
      updatedMessages = updatedMessages.slice(0, messageIndex + 1);
    }

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

    // Si shouldRegenerate es true, regenerar la respuesta
    if (shouldRegenerate) {
      sendMessage(newContent, conversation.modelId, conversationId);
    }
  };

  const regenerateResponse = async (messageIndex) => {
    if (!networkModels.length && !localModels.length) {
      toast.error('No models available');
      return;
    }
  
    try {
      const messages = currentConversation.messages;
      console.log('Before regeneration - messages:', messages);
  
      let userMessageIndex = messageIndex;
      if (messages[messageIndex].role === 'assistant') {
        userMessageIndex = messageIndex - 1;
      }
  
      const userMessage = messages[userMessageIndex];
      console.log('Found user message:', userMessage);
  
      // Keep messages up to user message only
      const keptMessages = messages.slice(0, userMessageIndex + 1);
      console.log('Kept messages:', keptMessages);
  
      const updatedConversation = {
        ...currentConversation,
        messages: keptMessages,
        isThinking: true,
        isRegenerating: true // Add flag
      };
  
      setCurrentConversation(updatedConversation);
      setConversations(prev => [
        updatedConversation,
        ...prev.filter(c => c.id !== currentConversation.id)
      ]);
  
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
    updateChatConfig
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