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
  const { networkModels } = useNetwork();

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
      title: initialMessages.length > 0 ? 'Fork: ' + initialMessages[0].content.slice(0, 30) + '...' : 'New Conversation',
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

  const sendMessage = async (content, modelId, conversationId) => {
    if (!networkModels.length) {
      toast.error('No models available');
      return;
    }

    try {
      // 1. Create user message
      const userMessage = { 
        role: 'user', 
        content, 
        timestamp: new Date().toISOString() 
      };

      // 2. Get or create conversation
      let conversation;
      if (!conversationId) {
        conversation = {
          id: crypto.randomUUID(),
          modelId,
          messages: [],
          title: content.slice(0, 30) + (content.length > 30 ? '...' : ''),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      } else {
        conversation = conversations.find(c => c.id === conversationId);
        if (!conversation) throw new Error('Conversation not found');
        conversation = { ...conversation };
      }

      // 3. Add user message and update UI
      conversation.messages = [...conversation.messages, userMessage];
      conversation.isThinking = true;
      
      setConversations(prev => [
        conversation,
        ...prev.filter(c => c.id !== conversation.id)
      ]);
      setCurrentConversation(conversation);

      // 4. Get API response with current configuration
      const apiKey = await window.electron.store.get('apiKey');
      const response = await axios.post(
        `${window.electron.config.API_URL}/v1/chat/completions`,
        {
          model: modelId,
          messages: conversation.messages,
          temperature: chatConfig.temperature,
          max_tokens: chatConfig.maxTokens,
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Accept': 'application/json'
          }
        }
      );

      // 5. Add AI response and update UI
      const aiMessage = { 
        role: 'assistant',
        content: response.data.choices[0].message.content,
        timestamp: new Date().toISOString()
      };

      conversation.messages = [...conversation.messages, aiMessage];
      conversation.isThinking = false;
      conversation.updatedAt = new Date().toISOString();

      setConversations(prev => [
        conversation,
        ...prev.filter(c => c.id !== conversation.id)
      ]);
      setCurrentConversation(conversation);

    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error('Failed to get response from the model');
      
      // 6. Handle error by adding error message
      if (conversationId) {
        const conversation = conversations.find(c => c.id === conversationId);
        if (conversation) {
          const errorMessage = { 
            role: 'assistant', 
            content: 'Sorry, I encountered an error processing your request. Please try again.',
            timestamp: new Date().toISOString(),
            isError: true
          };
          
          const updatedConversation = {
            ...conversation,
            messages: [...conversation.messages, errorMessage],
            isThinking: false,
            updatedAt: new Date().toISOString()
          };
          
          setConversations(prev => [
            updatedConversation,
            ...prev.filter(c => c.id !== conversationId)
          ]);
          setCurrentConversation(updatedConversation);
        }
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
    if (!networkModels.find(m => m.id === newModelId)) {
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

  const regenerateResponse = async (conversationId, messageIndex) => {
    const conversation = conversations.find(c => c.id === conversationId);
    if (!conversation) return;

    // Eliminar todos los mensajes después del índice del mensaje del usuario
    const updatedMessages = conversation.messages.slice(0, messageIndex + 1);
    
    // Actualizar la conversación sin las respuestas eliminadas
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

    // Regenerar la respuesta
    await sendMessage(
      updatedMessages[messageIndex].content,
      conversation.modelId,
      conversationId
    );
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