import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import { PencilIcon, TrashIcon, ClipboardIcon, CheckIcon, ArrowPathIcon, ArrowsPointingOutIcon } from '@heroicons/react/24/outline';
import { useChat } from '../../contexts/ChatContext';
import { toast } from 'react-hot-toast';

export default function ChatMessage({ message, onDelete, onEdit, onRegenerate, isLoading, messageIndex, totalMessages }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(message.content);
  const [isCopied, setIsCopied] = useState(false);
  const { createNewConversation, currentConversation, sendMessage } = useChat();

  const isLastMessage = messageIndex === totalMessages - 1;
  const isLastUserMessage = message.role === 'user' && isLastMessage;
  const isErrorMessage = message.isError === true;

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
        onEdit(editedContent, true); // true indicates regenerating responses
      }
      setIsEditing(false);
    } else {
      setIsEditing(true);
    }
  };

  const handleSave = () => {
    if (editedContent.trim() !== message.content) {
      onEdit(editedContent, true); // true indicates regenerating responses
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSave();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditedContent(message.content);
    }
  };

  const handleResend = async () => {
    try {
      onRegenerate(messageIndex);
    } catch (error) {
      console.error('Failed to resend message:', error);
      toast.error('Failed to resend message');
    }
  };

  return (
    <div className={`w-full ${message.role === 'assistant' ? 'bg-gray-800/50' : ''} ${isEditing ? 'bg-blue-900/10 border-l-2 border-blue-500' : ''} ${isErrorMessage ? 'bg-red-900/10 border-l-2 border-red-500' : ''}`}>
      <div className="container max-w-4xl mx-auto px-4 py-6">
        <div className="flex gap-6">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isErrorMessage ? 'bg-red-800' : 'bg-gray-700'}`}>
            {message.role === 'assistant' ? (isErrorMessage ? '⚠️' : '🤖') : '👤'}
          </div>
          <div className="flex-1 min-w-0 overflow-hidden">
            <div className="flex items-start justify-between gap-4">
              <div className={`flex-1 min-w-0 overflow-auto prose prose-invert prose-pre:my-0 ${isErrorMessage ? 'text-red-300' : ''}`}>
                {isEditing ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-blue-400 mb-2">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                      </svg>
                      <span>Editing message</span>
                    </div>
                    <textarea
                      value={editedContent}
                      onChange={(e) => setEditedContent(e.target.value)}
                      onKeyDown={handleKeyDown}
                      className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={Math.max(3, editedContent.split('\n').length)}
                      autoFocus
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => {
                          setIsEditing(false);
                          setEditedContent(message.content);
                        }}
                        className="px-3 py-1 text-sm text-gray-300 hover:text-white rounded-lg hover:bg-gray-700"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSave}
                        className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-lg"
                      >
                        Save & Regenerate
                      </button>
                    </div>
                  </div>
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
                {!isLoading && !isEditing && !isErrorMessage && (
                  <>
                    {message.role === 'user' ? (
                      <>
                        {isLastUserMessage && (
                          <button
                            onClick={handleResend}
                            className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-700"
                            title="Resend message"
                          >
                            <ArrowPathIcon className="w-4 h-4" />
                          </button>
                        )}
                        {isEditing ? (
                          <>
                            <button
                              onClick={handleSave}
                              className="p-1.5 text-green-500 hover:text-green-400 rounded-lg hover:bg-gray-700"
                              title="Save changes (Cmd/Ctrl + Enter)"
                            >
                              <CheckIcon className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setIsEditing(false);
                                setEditedContent(message.content);
                              }}
                              className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-700"
                              title="Cancel (Esc)"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={handleEdit}
                            className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-700"
                            title="Edit message"
                          >
                            <PencilIcon className="w-4 h-4" />
                          </button>
                        )}
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
                          <ArrowsPointingOutIcon className="w-4 h-4" />
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
                {!isLoading && !isEditing && isErrorMessage && message.role === 'assistant' && (
                  <button
                    onClick={() => onRegenerate(messageIndex - 1)}
                    className="p-1.5 text-red-400 hover:text-red-300 rounded-lg hover:bg-gray-700"
                    title="Try again"
                  >
                    <ArrowPathIcon className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
            {isErrorMessage && (
              <div className="mt-2 text-xs text-red-400">
                There was an error generating a response. You can try again or use a different model.
              </div>
            )}
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