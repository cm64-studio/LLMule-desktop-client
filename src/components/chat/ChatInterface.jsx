import React, { useEffect, useRef, useState } from 'react';
import { useChat } from '../../contexts/ChatContext';
import { useNetwork } from '../../contexts/NetworkContext';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import ChatConfig from './ChatConfig';
import { toast } from 'react-hot-toast';
import { 
  ArrowPathIcon, 
  PencilIcon, 
  Cog6ToothIcon, 
  EnvelopeIcon, 
  ShareIcon, 
  ChatBubbleLeftRightIcon,
  SparklesIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import ModelSelector from './ModelSelector';

export default function ChatInterface() {
  const { 
    currentConversation,
    sendMessage,
    isLoading,
    availableModels,
    createNewConversation,
    changeConversationModel,
    deleteMessage,
    editMessage,
    updateConversationTitle,
    chatConfig,
    updateChatConfig,
    regenerateResponse,
    cancelCurrentRequest
  } = useChat();
  
  const { isConnected, refreshModels, isDetecting, localModels, networkModels, checkBalance } = useNetwork();
  const messagesEndRef = useRef(null);
  const [pendingMessage, setPendingMessage] = useState(null);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [insufficientBalance, setInsufficientBalance] = useState(false);
  const [balanceInfo, setBalanceInfo] = useState(null);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentConversation?.messages]);

  useEffect(() => {
    if (!isLoading) {
      scrollToBottom();
    }
  }, [isLoading]);

  useEffect(() => {
    if (currentConversation) {
      setEditedTitle(currentConversation.title);
    }
  }, [currentConversation?.id]);

  const handleSend = async (content) => {
    if (!availableModels.length) {
      toast.error('No models available');
      return;
    }
    
    // Reset balance state on new message
    setInsufficientBalance(false);
    setBalanceInfo(null);
    
    try {
      const modelId = currentConversation?.modelId || availableModels[0].id;
      await sendMessage(content, modelId, currentConversation?.id);
      
      // Check balance after using network (spending tokens)
      const selectedModel = [...localModels, ...networkModels].find(m => m.id === modelId);
      if (!selectedModel?.type || selectedModel.type === 'network') {
        setTimeout(() => {
          checkBalance(true);
        }, 10000);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      // Don't show error toast for cancellations
      if (!error.message?.includes('Request cancelled by user')) {
        toast.error(error.message || 'Failed to send message');
      }
      
      // Ensure we reset the loading state when an error occurs
      if (isLoading) {
        cancelCurrentRequest();
      }
    }
  };

  const handleModelChange = (modelId) => {
    if (currentConversation) {
      changeConversationModel(currentConversation.id, modelId);
    } else {
      createNewConversation(modelId);
    }
  };

  const handleTitleEdit = () => {
    if (isEditingTitle && editedTitle.trim()) {
      updateConversationTitle(currentConversation.id, editedTitle.trim());
      setIsEditingTitle(false);
    } else {
      setIsEditingTitle(true);
    }
  };

  const handleTitleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleTitleEdit();
    } else if (e.key === 'Escape') {
      setIsEditingTitle(false);
      setEditedTitle(currentConversation.title);
    }
  };

  const InsufficientBalanceMessage = ({ availableBalance }) => (
    <div className="container max-w-4xl mx-auto px-4 py-6">
      <div className="flex gap-6">
        <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-red-600 text-white">
          <ExclamationTriangleIcon className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <div className="prose prose-invert">
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
              <h4 className="text-red-500 m-0 mb-2">Insufficient Balance</h4>
              <p className="text-sm text-gray-300 m-0">
                Please contact us as we're in beta.
              </p>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => window.electron.shell.openExternal('mailto:llmule@cm64.studio')}
                  className="flex items-center gap-1 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm text-white transition-colors"
                >
                  <EnvelopeIcon className="w-4 h-4" />
                  Contact Us
                </button>
                <button
                  onClick={() => handleSend(currentConversation.messages[currentConversation.messages.length - 2].content)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded text-sm text-white transition-colors"
                >
                  <ArrowPathIcon className="w-4 h-4" />
                  Try Again
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Add this helper function to check if a model is truly local
  const isModelTrulyLocal = (model, localModels) => {
    // Check if it's in the local models list
    const isInLocalList = localModels.some(m => m.name === model || m.id === model);
    
    // If it's not in the local list, it's definitely not local
    if (!isInLocalList) return false;
    
    // Find the model details
    const modelDetails = localModels.find(m => m.name === model || m.id === model);
    
    // If it's a custom model, check if it's using localhost
    if (modelDetails?.type === 'custom') {
      // Get the baseUrl from the model details
      const baseUrl = modelDetails.details?.baseUrl;
      if (!baseUrl) return false;
      
      // Check if the baseUrl is localhost or 127.0.0.1
      return baseUrl.includes('localhost') || 
             baseUrl.includes('127.0.0.1') || 
             baseUrl.includes('::1');
    }
    
    // For standard local models (ollama, lmstudio, etc.), they're always local
    return true;
  };

  if (isDetecting) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 bg-gray-900">
        <div className="text-center text-gray-400 max-w-md">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-6"></div>
          <h3 className="text-xl font-semibold mb-3 text-white">Detecting Models</h3>
          <p className="text-sm">Please wait while we detect available models on your system and the network...</p>
        </div>
      </div>
    );
  }

  const hasAvailableModels = localModels.length > 0 || networkModels.length > 0;

  if (!hasAvailableModels) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 bg-gray-900">
        <div className="text-center text-gray-400 max-w-md">
          <div className="text-5xl mb-6 text-gray-600">🤖</div>
          <h3 className="text-xl font-semibold mb-3 text-white">No Models Available</h3>
          <p className="text-sm mb-6">
            Please wait while we fetch available models.
            If this persists, try clicking the refresh button below.
          </p>
          <button
            onClick={refreshModels}
            disabled={isDetecting}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ArrowPathIcon className={`w-5 h-5 ${isDetecting ? 'animate-spin' : ''}`} />
            {isDetecting ? 'Detecting Models...' : 'Refresh Models'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header with model selector */}
      <div className="bg-gray-800/80 border-b border-gray-700 sticky top-0 z-10 backdrop-blur-sm">
        <div className="container max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center gap-4">
            <div className="flex-1 flex items-center gap-2">
              <SparklesIcon className="w-5 h-5 text-blue-400" />
              <ModelSelector
                models={[...localModels.map(m => ({ ...m, type: 'local' })), ...networkModels]}
                selectedModelId={currentConversation?.modelId || (localModels[0]?.id || networkModels[0]?.id)}
                onModelChange={handleModelChange}
                disabled={isLoading}
              />
              <button
                onClick={() => setIsConfigOpen(true)}
                className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-700 transition-colors"
                title="Chat Configuration"
              >
                <Cog6ToothIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-gradient-to-b from-gray-900 to-gray-800">
        {!currentConversation?.messages?.length ? (
          <div className="h-full flex items-center justify-center p-6">
            <div className="text-center max-w-md">
              <div className="bg-gradient-to-br from-blue-600 to-purple-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                <ChatBubbleLeftRightIcon className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-semibold mb-3 text-white">Start a Conversation</h3>
              <p className="text-gray-300 mb-6">
                Type a message below to begin your conversation with {availableModels.find(m => m.id === (currentConversation?.modelId || availableModels[0].id))?.id}
              </p>
              <div className="grid grid-cols-2 gap-3 text-left">
                <button className="bg-gray-800/50 p-3 rounded-lg border border-gray-700 hover:border-blue-500/50 hover:bg-gray-800 cursor-pointer transition-colors text-left">
                  <h4 className="font-medium text-white mb-1">Explain a concept</h4>
                  <p className="text-xs text-gray-400">Ask the AI to explain a complex topic in simple terms</p>
                </button>
                <button className="bg-gray-800/50 p-3 rounded-lg border border-gray-700 hover:border-blue-500/50 hover:bg-gray-800 cursor-pointer transition-colors text-left">
                  <h4 className="font-medium text-white mb-1">Creative writing</h4>
                  <p className="text-xs text-gray-400">Get help with stories, poems, or creative content</p>
                </button>
                <button className="bg-gray-800/50 p-3 rounded-lg border border-gray-700 hover:border-blue-500/50 hover:bg-gray-800 cursor-pointer transition-colors text-left">
                  <h4 className="font-medium text-white mb-1">Code assistance</h4>
                  <p className="text-xs text-gray-400">Get help with programming or debugging code</p>
                </button>
                <button className="bg-gray-800/50 p-3 rounded-lg border border-gray-700 hover:border-blue-500/50 hover:bg-gray-800 cursor-pointer transition-colors text-left">
                  <h4 className="font-medium text-white mb-1">Brainstorm ideas</h4>
                  <p className="text-xs text-gray-400">Generate creative ideas for projects or solutions</p>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-gray-700/50">
            {currentConversation.messages.map((message, index) => (
              message.content === 'INSUFFICIENT_BALANCE' ? (
                <InsufficientBalanceMessage
                  key={`${message.timestamp}-${index}`}
                  availableBalance={message.metadata?.availableBalance}
                />
              ) : (
                <ChatMessage 
                  key={`${message.timestamp}-${index}`} 
                  message={message}
                  onDelete={() => deleteMessage(currentConversation.id, index)}
                  onEdit={(newContent, shouldRegenerate) => editMessage(currentConversation.id, index, newContent, shouldRegenerate)}
                  onRegenerate={() => regenerateResponse(index)}
                  isLoading={isLoading}
                  messageIndex={index}
                  totalMessages={currentConversation.messages.length}
                />
              )
            ))}
            {currentConversation?.isThinking && (
              <div className={`w-full bg-gray-800/50`}>
                <div className="container max-w-4xl mx-auto px-4 py-6">
                  <div className="flex gap-6">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-gradient-to-br from-purple-500 to-blue-600 text-white">
                      <SparklesIcon className="w-5 h-5 animate-pulse" />
                    </div>
                    <div className="flex items-center gap-2 text-gray-400">
                      <div className="flex gap-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                      <span className="text-sm">Thinking...</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} style={{ height: '24px' }} />
          </div>
        )}
      </div>

      {/* Chat Input */}
      <div className="border-t border-gray-700 bg-gray-800">
        <div className="container mx-auto">
          <ChatInput
            onSend={handleSend}
            onCancel={cancelCurrentRequest}
            disabled={!availableModels.length}
            isLoading={isLoading}
            pendingMessage={pendingMessage}
            setPendingMessage={setPendingMessage}
            insufficientBalance={insufficientBalance}
            balanceInfo={balanceInfo}
            isLocalModel={currentConversation?.modelId ? 
              isModelTrulyLocal(currentConversation.modelId, localModels) : 
              false
            }
          />
        </div>
      </div>

      <ChatConfig
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        config={chatConfig}
        onConfigChange={updateChatConfig}
      />
    </div>
  );
} 