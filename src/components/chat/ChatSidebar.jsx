import React, { useState } from 'react';
import { useChat } from '../../contexts/ChatContext';
import { useNetwork } from '../../contexts/NetworkContext';
import { PlusIcon, TrashIcon, PencilIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';

export default function ChatSidebar() {
  const {
    conversations,
    currentConversation,
    setCurrentConversation,
    availableModels,
    createNewConversation,
    deleteConversation,
    updateConversationTitle
  } = useChat();

  const { isConnected } = useNetwork();
  const [editingTitleId, setEditingTitleId] = useState(null);
  const [editedTitle, setEditedTitle] = useState('');

  const handleNewChat = async () => {
    if (!availableModels.length) {
      toast.error('No models available. Please wait for models to be detected.');
      return;
    }

    try {
      console.log('Creating new chat with model:', availableModels[0].id);
      const newConversation = await createNewConversation(availableModels[0].id);
      console.log('New conversation created:', newConversation);
      
      // Wait for state to update
      await new Promise(resolve => setTimeout(resolve, 100));
      
      if (newConversation?.id) {
        setCurrentConversation(newConversation);
      } else {
        throw new Error('Failed to create conversation');
      }
    } catch (error) {
      console.error('Failed to create new conversation:', error);
      toast.error('Failed to create new conversation');
    }
  };

  const handleEditTitle = (conversation) => {
    setEditingTitleId(conversation.id);
    setEditedTitle(conversation.title);
  };

  const handleTitleSave = (conversationId) => {
    if (editedTitle.trim()) {
      updateConversationTitle(conversationId, editedTitle.trim());
    }
    setEditingTitleId(null);
    setEditedTitle('');
  };

  const handleTitleKeyDown = (e, conversationId) => {
    if (e.key === 'Enter') {
      handleTitleSave(conversationId);
    } else if (e.key === 'Escape') {
      setEditingTitleId(null);
      setEditedTitle('');
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="w-80 bg-gray-800 border-r border-gray-700 flex flex-col h-full">
      {/* Header with Title and New Chat Button */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">💬</span>
            <h2 className="text-xl font-semibold">Chats</h2>
          </div>
          <button
            onClick={handleNewChat}
            disabled={availableModels.length === 0}
            className="flex items-center gap-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg py-1.5 px-3 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            <PlusIcon className="w-4 h-4" />
            <span>New Chat</span>
            <span className="text-gray-400 text-xs">(⌘N)</span>
          </button>
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {conversations.map((conversation) => (
          <div
            key={conversation.id}
            onClick={() => setCurrentConversation(conversation)}
            className={`p-4 border-b border-gray-700 cursor-pointer hover:bg-gray-700 transition-colors ${
              currentConversation?.id === conversation.id ? 'bg-gray-700' : ''
            }`}
          >
            <div className="flex justify-between items-start gap-2">
              <div className="flex-1 min-w-0">
                {editingTitleId === conversation.id ? (
                  <input
                    type="text"
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    onKeyDown={(e) => handleTitleKeyDown(e, conversation.id)}
                    onBlur={() => handleTitleSave(conversation.id)}
                    className="w-full bg-gray-600 text-white rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Conversation title..."
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <div className="group">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-medium text-gray-200 truncate group-hover:text-white">
                        {conversation.title || 'New Conversation'}
                      </h3>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditTitle(conversation);
                        }}
                        className="p-1 -m-1 text-gray-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Edit title"
                      >
                        <PencilIcon className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-shrink-0 w-2 h-2 rounded-full bg-gradient-to-br from-blue-400 to-blue-600" />
                      <p className="text-xs text-gray-400">
                        {conversation.modelId}
                      </p>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatDate(conversation.createdAt)}
                    </p>
                  </div>
                )}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteConversation(conversation.id);
                }}
                className="text-gray-400 hover:text-red-500 transition-colors p-1"
                title="Delete conversation"
              >
                <TrashIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 