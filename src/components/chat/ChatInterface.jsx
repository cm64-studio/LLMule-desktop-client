import React, { useEffect, useRef, useState } from 'react';
import { useChat } from '../../contexts/ChatContext';
import { useNetwork } from '../../contexts/NetworkContext';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import ChatConfig from './ChatConfig';
import { toast } from 'react-hot-toast';
import { ArrowPathIcon, PencilIcon, Cog6ToothIcon, EnvelopeIcon, ShareIcon } from '@heroicons/react/24/outline';
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
  
  const { isConnected, refreshModels, isDetecting, localModels, networkModels } = useNetwork();
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
    } catch (error) {
      console.error('Failed to send message:', error);
      // Don't show error toast for cancellations
      if (!error.message?.includes('Request cancelled by user')) {
        toast.error(error.message || 'Failed to send message');
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
        <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-gray-700">
          🤖
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
                  className="flex items-center gap-1 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm text-white"
                >
                  Contact Us
                </button>
                <button
                  onClick={() => handleSend(currentConversation.messages[currentConversation.messages.length - 2].content)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded text-sm text-white"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (isDetecting) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center text-gray-400 max-w-md">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <h3 className="text-xl font-semibold mb-2">Detecting Models</h3>
          <p className="text-sm">Please wait while we detect available models...</p>
        </div>
      </div>
    );
  }

  const hasAvailableModels = localModels.length > 0 || networkModels.length > 0;

  if (!hasAvailableModels) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center text-gray-400 max-w-md">
          <div className="text-4xl mb-4">🤖</div>
          <h3 className="text-xl font-semibold mb-2">No Models Available</h3>
          <p className="text-sm mb-4">
            Please wait while we fetch available models.
            If this persists, try clicking the refresh button below.
          </p>
          <button
            onClick={refreshModels}
            disabled={isDetecting}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
      <div className="bg-gray-800/50 border-b border-gray-700 sticky top-0 z-10">
        <div className="container max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center gap-4">
            <div className="flex-1 flex items-center gap-2">
              🤖
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
      <div className="flex-1 overflow-y-auto">
        {!currentConversation?.messages?.length ? (
          <div className="h-[calc(100vh-200px)] flex items-center justify-center">
            <div className="text-center text-gray-400">
              <div className="text-4xl mb-4">💭</div>
              <h3 className="text-xl font-semibold mb-2">Start a Conversation</h3>
              <p className="text-sm">
                Type a message to begin your conversation with {availableModels.find(m => m.id === (currentConversation?.modelId || availableModels[0].id))?.id}
              </p>
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
                    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-gray-700">
                      🤖
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
        <div className="container mx-auto ">
          <ChatInput
            onSend={handleSend}
            onCancel={cancelCurrentRequest}
            disabled={isLoading && !insufficientBalance}
            isLoading={isLoading}
            pendingMessage={pendingMessage}
            setPendingMessage={setPendingMessage}
            insufficientBalance={insufficientBalance}
            balanceInfo={balanceInfo}
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