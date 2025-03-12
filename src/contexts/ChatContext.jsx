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
  const [isStreaming, setIsStreaming] = useState(false);
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
    const requestId = uuidv4();
    setCurrentRequestId(requestId);
    
    try {
      setIsLoading(true);
      
      // Check if we're regenerating a response
      if (existingConversation) {
        conversation = { ...existingConversation };
      } 
      // Check if we're continuing an existing conversation
      else if (conversationId) {
        conversation = conversations.find(c => c.id === conversationId);
        if (!conversation) {
          throw new Error('Conversation not found');
        }
        conversation = { ...conversation };
      } 
      // Otherwise, create a new conversation
      else {
        conversation = {
          id: uuidv4(),
          title: 'New Conversation',
          modelId: modelId || defaultModelId,
          messages: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isThinking: true
        };
      }
  
      // Add the user message if it's not a regeneration
      if (!existingConversation) {
        const userMessage = {
          role: 'user',
          content,
          timestamp: new Date().toISOString()
        };
        
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
        let systemPrompt = chatConfig.systemPrompt;
        
        if (!systemPrompt.includes('<thinking>') && !systemPrompt.includes('<think>') && !systemPrompt.includes('thinking process')) {
          systemPrompt += '\n\nFor complex reasoning, you can use <thinking></thinking> or <think></think> tags at the beginning of your response to show your step-by-step reasoning process. This will be displayed in a collapsible section in the UI.';
        }
        
        messagesToSend = [{ role: 'system', content: systemPrompt }, ...messagesToSend];
      }
      
      console.log('Sending messages to LLM:', messagesToSend);
  
      try {
        // Determine if the model is a network model
        const isNetworkModel = !localModels.some(m => m.name === modelId || m.id === modelId);
        const shouldStream = !isNetworkModel; // Only stream for local models

        // Initialize a streaming response
        let streamedContent = '';
        
        // For network models, just set thinking state without adding empty message
        if (!shouldStream) {
          conversation.isThinking = true;
          setConversations(prev => [conversation, ...prev.filter(c => c.id !== conversation.id)]);
          setCurrentConversation(conversation);
        } else {
          // Only add placeholder message for streaming models
          const assistantMessage = { 
            role: 'assistant', 
            content: '', 
            timestamp: new Date().toISOString(),
            isStreaming: true
          };
          
          conversation.messages = [...conversation.messages, assistantMessage];
          conversation.isThinking = false;
          setConversations(prev => [conversation, ...prev.filter(c => c.id !== conversation.id)]);
          setCurrentConversation(conversation);
        }
        
        setIsStreaming(shouldStream);
        
        // Handle the stream chunk updates
        const handleStreamUpdate = (chunk) => {
          if (chunk && chunk.content && shouldStream) {
            console.log('Stream update received:', chunk.content.length, 'characters');
            
            // Update the streamed content
            streamedContent += chunk.content;
            
            // Update the message in the conversation
            const updatedMessages = [...conversation.messages];
            const lastIndex = updatedMessages.length - 1;
            updatedMessages[lastIndex] = {
              ...updatedMessages[lastIndex],
              content: streamedContent,
              isStreaming: true
            };
            
            conversation.messages = updatedMessages;
            
            // Force a re-render by creating a new conversation object
            const updatedConversation = {...conversation};
            
            setConversations(prev => [updatedConversation, ...prev.filter(c => c.id !== conversation.id)]);
            setCurrentConversation(updatedConversation);
          }
        };
        
        // Request with streaming enabled for local models only
        const response = await window.electron.llm.chat({
          model: modelId,
          messages: messagesToSend,
          temperature: chatConfig.temperature,
          max_tokens: chatConfig.maxTokens,
          stream: shouldStream,
          type: localModels.find(m => m.name === modelId || m.id === modelId)?.type,
          isLocal: !isNetworkModel,
          requestId,
          onUpdate: shouldStream ? handleStreamUpdate : undefined
        });
        
        // When streaming is complete or if streaming wasn't supported
        if (response?.content) {
          // For non-streaming responses or final content
          const finalContent = response.content;
          
          if (!shouldStream) {
            // For network models, add the message now that we have content
            conversation.messages = [...conversation.messages, {
              role: 'assistant',
              content: finalContent,
              timestamp: new Date().toISOString(),
              isStreaming: false
            }];
            
            // Update balance after using network model (spending tokens)
            setTimeout(() => {
              checkBalance(true);
            }, 2000);
          } else {
            // For streaming models, update the existing message
            const updatedMessages = [...conversation.messages];
            const lastIndex = updatedMessages.length - 1;
            updatedMessages[lastIndex] = {
              role: 'assistant',
              content: finalContent,
              timestamp: new Date().toISOString(),
              isStreaming: false
            };
            conversation.messages = updatedMessages;
          }
          
          conversation.isThinking = false;
          conversation.updatedAt = new Date().toISOString();
          
          setConversations(prev => [conversation, ...prev.filter(c => c.id !== conversation.id)]);
          setCurrentConversation(conversation);
        }
      } catch (apiError) {
        console.error('API error:', apiError);
        
        if (apiError.message?.includes('An object could not be cloned')) {
          // This is likely a serialization error, try again without streaming
          console.log('Serialization error detected, retrying without streaming');
          
          const response = await window.electron.llm.chat({
            model: modelId,
            messages: messagesToSend,
            temperature: chatConfig.temperature,
            max_tokens: chatConfig.maxTokens,
            stream: false, // Disable streaming
            type: localModels.find(m => m.name === modelId || m.id === modelId)?.type,
            isLocal: localModels.some(m => m.name === modelId || m.id === modelId),
            requestId
          });
          
          if (response?.content) {
            // Update the last message with the content
            const updatedMessages = [...conversation.messages];
            const lastIndex = updatedMessages.length - 1;
            updatedMessages[lastIndex] = {
              role: 'assistant',
              content: response.content,
              timestamp: new Date().toISOString(),
              isStreaming: false
            };
            
            conversation.messages = updatedMessages;
            conversation.isThinking = false;
            conversation.updatedAt = new Date().toISOString();
            
            setConversations(prev => [conversation, ...prev.filter(c => c.id !== conversation.id)]);
            setCurrentConversation(conversation);

            // Update balance after using network model (spending tokens)
            if (!isNetworkModel) {
              setTimeout(() => {
                checkBalance(true);
              }, 2000);
            }
          } else {
            throw new Error('Invalid response');
          }
        } else {
          // Re-throw other errors
          throw apiError;
        }
      }
      
      setIsStreaming(false);
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
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
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
        setIsStreaming(false);
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
    if (!currentConversation) return;
  
    try {
      console.log(`Regenerating response from message index ${messageIndex}`);
      
      // Find the most recent user message up to the specified index
      const messages = currentConversation.messages.slice(0, messageIndex + 1);
      const lastUserMessageIndex = messages.findLastIndex(m => m.role === 'user');
      
      if (lastUserMessageIndex === -1) {
        console.error('No user message found to regenerate from');
        return;
      }
      
      // Get a clean copy of the conversation state up to the last user message
      const conversationCopy = {
        ...currentConversation,
        messages: messages.slice(0, lastUserMessageIndex + 1)
      };
      
      const lastUserMessage = messages[lastUserMessageIndex];
      
      console.log('Regenerating from message:', lastUserMessage);
      
      // Call sendMessage with the content of the last user message and the current conversation state
      try {
        await sendMessage(
          lastUserMessage.content,
          currentConversation.modelId,
          null,
          conversationCopy
        );
      } catch (e) {
        console.error('Failed to regenerate:', e);
        
        // If there's a serialization error, try again without streaming
        if (e.message?.includes('An object could not be cloned')) {
          console.log('Serialization error during regeneration, retrying without streaming');
          
          // We need to get a new requestId
          const requestId = uuidv4();
          setCurrentRequestId(requestId);
          
          // Re-create the placeholder message
          const assistantMessage = { 
            role: 'assistant', 
            content: '', 
            timestamp: new Date().toISOString(),
            isStreaming: false
          };
          
          conversationCopy.messages = [...conversationCopy.messages, assistantMessage];
          conversationCopy.isThinking = true;
          
          // Update UI
          setConversations(prev => [conversationCopy, ...prev.filter(c => c.id !== conversationCopy.id)]);
          setCurrentConversation(conversationCopy);
          setIsLoading(true);
          
          // Prepare messages for API
          let messagesToSend = [...conversationCopy.messages];
          
          if (chatConfig.systemPrompt) {
            let systemPrompt = chatConfig.systemPrompt;
            
            if (!systemPrompt.includes('<thinking>') && !systemPrompt.includes('<think>') && !systemPrompt.includes('thinking process')) {
              systemPrompt += '\n\nFor complex reasoning, you can use <thinking></thinking> or <think></think> tags at the beginning of your response to show your step-by-step reasoning process. This will be displayed in a collapsible section in the UI.';
            }
            
            messagesToSend = [{ role: 'system', content: systemPrompt }, ...messagesToSend];
          }
          
          // Try again without streaming
          try {
            const response = await window.electron.llm.chat({
              model: currentConversation.modelId,
              messages: messagesToSend,
              temperature: chatConfig.temperature,
              max_tokens: chatConfig.maxTokens,
              stream: false, // Disable streaming
              type: localModels.find(m => m.name === currentConversation.modelId || m.id === currentConversation.modelId)?.type,
              isLocal: localModels.some(m => m.name === currentConversation.modelId || m.id === currentConversation.modelId),
              requestId
            });
            
            if (response?.content) {
              // Update the last message with the content
              const updatedMessages = [...conversationCopy.messages];
              const lastIndex = updatedMessages.length - 1;
              updatedMessages[lastIndex] = {
                role: 'assistant',
                content: response.content,
                timestamp: new Date().toISOString(),
                isStreaming: false
              };
              
              conversationCopy.messages = updatedMessages;
              conversationCopy.isThinking = false;
              conversationCopy.updatedAt = new Date().toISOString();
              
              setConversations(prev => [conversationCopy, ...prev.filter(c => c.id !== conversationCopy.id)]);
              setCurrentConversation(conversationCopy);
            } else {
              throw new Error('Invalid response');
            }
          } catch (finalError) {
            // Handle any remaining errors
            console.error('Final regeneration attempt failed:', finalError);
            toast.error('Failed to regenerate response: ' + finalError.message);
            
            // Update UI to show error state
            conversationCopy.isThinking = false;
            conversationCopy.messages = [
              ...conversationCopy.messages.slice(0, -1),
              { 
                role: 'assistant', 
                content: `**Error:** ${finalError.message}`, 
                timestamp: new Date().toISOString(),
                isError: true
              }
            ];
            
            setConversations(prev => [conversationCopy, ...prev.filter(c => c.id !== conversationCopy.id)]);
            setCurrentConversation(conversationCopy);
          } finally {
            setIsLoading(false);
            setIsStreaming(false);
          }
        }
      }
    } catch (error) {
      console.error('Regeneration error:', error);
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
    isStreaming,
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