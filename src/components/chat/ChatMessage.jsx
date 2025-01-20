import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import { PencilIcon, TrashIcon, ClipboardIcon, CheckIcon, ArrowPathIcon, Square2StackIcon } from '@heroicons/react/24/outline';
import { useChat } from '../../contexts/ChatContext';
import { toast } from 'react-hot-toast';

export default function ChatMessage({ message, onDelete, onEdit, onRegenerate, isLoading, messageIndex, totalMessages }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(message.content);
  const [isCopied, setIsCopied] = useState(false);
  const { createNewConversation, currentConversation } = useChat();

  // Show loading indicator only for the last message when there's a pending response
  const showLoading = currentConversation?.pendingResponse && 
                     messageIndex === (currentConversation.messages.length - 1) &&
                     message.role === 'user';

  const handleFork = async () => {
    try {
      // Get messages up to current point
      const messagesUpToPoint = currentConversation.messages.slice(0, messageIndex + 1);
      
      // Create new conversation with same model and messages up to this point
      await createNewConversation(currentConversation.modelId, messagesUpToPoint);
      
      toast.success('Created new conversation from this point');
    } catch (error) {
      console.error('Failed to fork conversation:', error);
      toast.error('Failed to create fork');
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
      toast.success('Copied to clipboard');
    } catch (err) {
      toast.error('Failed to copy to clipboard');
    }
  };

  const handleEdit = () => {
    if (isEditing) {
      if (editedContent.trim() !== message.content) {
        onEdit(editedContent, true); // true indica regenerar respuestas
      }
      setIsEditing(false);
    } else {
      setIsEditing(true);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleEdit();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditedContent(message.content);
    }
  };

  const isLastUserMessage = message.role === 'user' && messageIndex < totalMessages - 1;

  return (
    <div className={`${message.role === 'assistant' ? 'bg-gray-800/50' : ''}`}>
      <div className="container max-w-4xl mx-auto px-4 py-6">
        <div className="flex gap-6">
          <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-gray-700">
            {message.role === 'assistant' ? '🤖' : '👤'}
          </div>
          <div className="flex-1 min-w-0 overflow-hidden">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0 overflow-auto prose prose-invert prose-pre:my-0">
                {isEditing ? (
                  <textarea
                    value={editedContent}
                    onChange={(e) => setEditedContent(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={editedContent.split('\n').length}
                    autoFocus
                  />
                ) : (
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      code({ node, inline, className, children, ...props }) {
                        const match = /language-(\w+)/.exec(className || '');
                        return !inline && match ? (
                          <div className="relative group not-prose">
                            <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(String(children));
                                  toast.success('Code copied to clipboard');
                                }}
                                className="p-1 bg-gray-700 rounded hover:bg-gray-600"
                                title="Copy code"
                              >
                                <ClipboardIcon className="w-4 h-4" />
                              </button>
                            </div>
                            <div className="overflow-x-auto bg-gray-900 rounded-lg">
                              <SyntaxHighlighter
                                style={oneDark}
                                language={match[1]}
                                PreTag="div"
                                {...props}
                                customStyle={{
                                  margin: 0,
                                  borderRadius: '0.5rem',
                                  padding: '1rem',
                                  background: 'transparent'
                                }}
                              >
                                {String(children).replace(/\n$/, '')}
                              </SyntaxHighlighter>
                            </div>
                          </div>
                        ) : (
                          <code className={`${className} bg-gray-800 px-1.5 py-0.5 rounded`} {...props}>
                            {children}
                          </code>
                        );
                      },
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {!isLoading && (
                  <>
                    {message.role === 'user' ? (
                      <>
                        <button
                          onClick={handleEdit}
                          className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-700"
                          title={isEditing ? "Save (Cmd/Ctrl + Enter)" : "Edit"}
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDelete()}
                          className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-gray-700"
                          title="Delete"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => onRegenerate(messageIndex)}
                          className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-700"
                          title="Regenerate response"
                        >
                          <ArrowPathIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={handleFork}
                          className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-700"
                          title="Fork conversation from here"
                        >
                          <Square2StackIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDelete()}
                          className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-gray-700"
                          title="Delete message"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    <button
                      onClick={handleCopy}
                      className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-700"
                      title="Copy to clipboard"
                    >
                      {isCopied ? (
                        <CheckIcon className="w-4 h-4 text-green-500" />
                      ) : (
                        <ClipboardIcon className="w-4 h-4" />
                      )}
                    </button>
                  </>
                )}
              </div>
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
              {message.timestamp && (
                <span>{new Date(message.timestamp).toLocaleTimeString()}</span>
              )}
              {message.edited && (
                <span className="text-gray-600">(edited)</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 