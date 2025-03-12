import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import { 
  PencilIcon, 
  TrashIcon, 
  ClipboardIcon, 
  CheckIcon, 
  ArrowPathIcon, 
  ArrowUturnRightIcon,
  XMarkIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  LightBulbIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import { useChat } from '../../contexts/ChatContext';
import { toast } from 'react-hot-toast';

export default function ChatMessage({ message, onDelete, onEdit, onRegenerate, isLoading, messageIndex, totalMessages }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(message.content);
  const [isCopied, setIsCopied] = useState(false);
  const [processedContent, setProcessedContent] = useState({ main: '', thinking: '' });
  const [isThinkingExpanded, setIsThinkingExpanded] = useState(false);
  const { createNewConversation, currentConversation, sendMessage, isStreaming } = useChat();

  const isLastMessage = messageIndex === totalMessages - 1;
  const isLastUserMessage = message.role === 'user' && isLastMessage;
  const isErrorMessage = message.isError === true;
  const isUserMessage = message.role === 'user';
  const hasThinking = processedContent.thinking.length > 0;
  const isStreamingMessage = message.isStreaming && isStreaming && isLastMessage && !isUserMessage;
  
  // Process content to extract thinking blocks
  useEffect(() => {
    if (message.content && !isUserMessage) {
      const thinkingRegex = /<(thinking|think)>([\s\S]*?)<\/(thinking|think)>/g;
      const thinkingMatches = [...message.content.matchAll(thinkingRegex)];
      
      if (thinkingMatches.length > 0) {
        let mainContent = message.content;
        const thinkingContent = thinkingMatches.map(match => match[2].trim()).join('\n\n');
        
        // Remove thinking tags from main content
        mainContent = mainContent.replace(thinkingRegex, '').trim();
        
        setProcessedContent({
          main: mainContent,
          thinking: thinkingContent
        });
      } else {
        setProcessedContent({
          main: message.content,
          thinking: ''
        });
      }
    } else {
      setProcessedContent({
        main: message.content,
        thinking: ''
      });
    }
  }, [message.content, isUserMessage]);

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

  const toggleThinking = () => {
    setIsThinkingExpanded(!isThinkingExpanded);
  };

  // Markdown component for rendering content
  const MarkdownContent = ({ content }) => (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        code({ node, inline, className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || '');
          return !inline && match ? (
            <div className="relative group not-prose my-4">
              <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(String(children));
                    toast.success('Code copied to clipboard');
                  }}
                  className="p-1.5 bg-gray-700/80 backdrop-blur-sm rounded-md hover:bg-gray-600 transition-colors"
                  title="Copy code"
                >
                  <ClipboardIcon className="w-4 h-4" />
                </button>
              </div>
              <div className="overflow-hidden bg-gray-900 rounded-lg shadow-lg ring-1 ring-gray-700/50">
                <div className="flex items-center px-4 py-2 bg-gray-800/80 text-xs text-gray-400 border-b border-gray-700/50">
                  <span className="flex-1 font-mono">{match[1]}</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(String(children));
                      toast.success('Code copied to clipboard');
                    }}
                    className="p-1 hover:bg-gray-700/80 rounded-md transition-colors"
                    title="Copy code"
                  >
                    <ClipboardIcon className="w-3.5 h-3.5" />
                  </button>
                </div>
                <SyntaxHighlighter
                  style={oneDark}
                  language={match[1]}
                  PreTag="div"
                  {...props}
                  customStyle={{
                    margin: 0,
                    padding: '1rem',
                    background: 'transparent',
                    borderRadius: 0,
                    border: 'none'
                  }}
                  codeTagProps={{
                    style: {
                      fontFamily: 'JetBrains Mono, Menlo, Monaco, Consolas, "Courier New", monospace'
                    }
                  }}
                >
                  {String(children).replace(/\n$/, '')}
                </SyntaxHighlighter>
              </div>
            </div>
          ) : (
            <code className={`${className} font-mono bg-gray-800/70 px-1.5 py-0.5 rounded text-sm`} {...props}>
              {children}
            </code>
          );
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );

  return (
    <div 
      className={`w-full transition-colors duration-200 ${
        isUserMessage 
          ? 'bg-gray-800/30' 
          : isErrorMessage 
            ? 'bg-red-900/10 border-l-2 border-red-500' 
            : isStreamingMessage
              ? 'bg-gray-800/50 border-l-2 border-blue-500'
              : 'bg-gray-800/50'
      } ${isEditing ? 'bg-blue-900/10 border-l-2 border-blue-500' : ''}`}
    >
      <div className="container max-w-4xl mx-auto px-4 py-6">
        <div className="flex gap-6">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
            isUserMessage 
              ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white' 
              : isErrorMessage 
                ? 'bg-red-800' 
                : 'bg-gradient-to-br from-purple-500 to-blue-600'
          }`}>
            {isUserMessage ? (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" />
              </svg>
            ) : isErrorMessage ? '⚠️' : '🤖'}
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
                  <>
                    {/* Thinking section - now at the beginning */}
                    {hasThinking && (
                      <div className="mb-4">
                        <button
                          onClick={toggleThinking}
                          className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 bg-blue-900/20 hover:bg-blue-900/30 px-3 py-2 rounded-lg transition-colors w-full"
                        >
                          <LightBulbIcon className="w-4 h-4" />
                          <span className="font-medium">Model Thinking Process</span>
                          {isThinkingExpanded ? (
                            <ChevronUpIcon className="w-4 h-4 ml-auto" />
                          ) : (
                            <ChevronDownIcon className="w-4 h-4 ml-auto" />
                          )}
                        </button>
                        
                        {isThinkingExpanded && (
                          <div className="mt-3 p-4 bg-gray-800/70 border border-blue-900/30 rounded-lg">
                            <MarkdownContent content={processedContent.thinking} />
                          </div>
                        )}
                      </div>
                    )}
                    
                    <MarkdownContent content={processedContent.main} />
                    
                    {/* Show cursor animation for streaming content */}
                    {isStreamingMessage && (
                      <span className="ml-1 inline-block w-2 h-4 bg-blue-500 animate-cursor-blink"></span>
                    )}
                  </>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {!isLoading && !isEditing && !isErrorMessage && !isStreamingMessage && (
                  <>
                    {isUserMessage ? (
                      <>
                        {isLastUserMessage && (
                          <button
                            onClick={handleResend}
                            className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-700 bg-gray-800/70"
                            title="Resend message"
                          >
                            <ArrowPathIcon className="w-4 h-4" />
                          </button>
                        )}
                        {isEditing ? (
                          <>
                            <button
                              onClick={handleSave}
                              className="p-1.5 text-green-500 hover:text-green-400 rounded-lg hover:bg-gray-700 bg-gray-800/70"
                              title="Save changes (Cmd/Ctrl + Enter)"
                            >
                              <CheckIcon className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setIsEditing(false);
                                setEditedContent(message.content);
                              }}
                              className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-700 bg-gray-800/70"
                              title="Cancel (Esc)"
                            >
                              <XMarkIcon className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={handleEdit}
                            className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-700 bg-gray-800/70"
                            title="Edit message"
                          >
                            <PencilIcon className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={handleCopy}
                          className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-700 bg-gray-800/70"
                          title="Copy to clipboard"
                        >
                          {isCopied ? (
                            <CheckIcon className="w-4 h-4 text-green-500" />
                          ) : (
                            <ClipboardIcon className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => onDelete()}
                          className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-gray-700 bg-gray-800/70"
                          title="Delete"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={handleCopy}
                          className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-700 bg-gray-800/70"
                          title="Copy to clipboard"
                        >
                          {isCopied ? (
                            <CheckIcon className="w-4 h-4 text-green-500" />
                          ) : (
                            <ClipboardIcon className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => onRegenerate(messageIndex)}
                          className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-700 bg-gray-800/70"
                          title="Regenerate response"
                        >
                          <ArrowPathIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={handleFork}
                          className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-700 bg-gray-800/70"
                          title="Fork conversation from here"
                        >
                          <ArrowUturnRightIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDelete()}
                          className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-gray-700 bg-gray-800/70"
                          title="Delete message"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </>
                )}
                {!isLoading && !isEditing && isErrorMessage && message.role === 'assistant' && (
                  <button
                    onClick={() => onRegenerate(messageIndex - 1)}
                    className="p-1.5 text-red-400 hover:text-red-300 rounded-lg hover:bg-gray-700 bg-gray-800/70"
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
              {hasThinking && (
                <span className="text-blue-400 flex items-center gap-1">
                  <LightBulbIcon className="w-3 h-3" />
                  <span>Includes thinking process</span>
                </span>
              )}
              {isStreamingMessage && (
                <span className="text-blue-400 flex items-center gap-1 animate-pulse">
                  <SparklesIcon className="w-3 h-3" />
                  <span>Generating...</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 