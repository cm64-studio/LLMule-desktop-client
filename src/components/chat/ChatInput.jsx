import React, { useState, useRef, useEffect } from 'react';
import { PaperAirplaneIcon, StopIcon } from '@heroicons/react/24/solid';
import { ExclamationTriangleIcon, ShieldCheckIcon, CommandLineIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';

export default function ChatInput({ 
  onSend, 
  onCancel,
  disabled, 
  isLoading = false,
  placeholder = "Type a message...",
  insufficientBalance = false,
  balanceInfo = null,
  isLocalModel = false
}) {
  const [message, setMessage] = useState('');
  const [hasFocus, setHasFocus] = useState(false);
  const textareaRef = useRef(null);
  const messageRef = useRef(message);

  // Keep messageRef in sync with message state
  useEffect(() => {
    messageRef.current = message;
  }, [message]);

  // Preserve focus and message during re-renders
  useEffect(() => {
    if (hasFocus && textareaRef.current) {
      textareaRef.current.focus();
      // Restore cursor to end of text
      const length = messageRef.current.length;
      textareaRef.current.setSelectionRange(length, length);
    }
  }, [hasFocus, disabled]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!message.trim() || disabled) return;
    
    if (insufficientBalance) {
      // Prevent sending if there's insufficient balance
      toast.error('Insufficient balance. Please share models or contact us.');
      return;
    }
    
    onSend(message.trim());
    setMessage('');
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Dynamic placeholder based on model type
  const getPlaceholder = () => {
    if (insufficientBalance) return "Insufficient balance. Please share models or contact us.";
    if (isLocalModel) return "Message your local AI model...";
    return "Message the network model...";
  };

  return (
    <form onSubmit={handleSubmit} className="bg-gray-800 p-4">
      <div className="max-w-3xl mx-auto">
        <div className={`flex items-end gap-2 bg-gray-700 rounded-xl p-1.5 ${hasFocus ? 'ring-2 ring-blue-500/50' : ''} ${insufficientBalance ? 'border border-red-500/50' : ''} transition-all duration-200`}>
          <div className="flex-1 min-w-0">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setHasFocus(true)}
              onBlur={() => setHasFocus(false)}
              placeholder={getPlaceholder()}
              rows={1}
              disabled={disabled || isLoading}
              className={`w-full bg-transparent text-white px-2 py-1.5 focus:outline-none resize-none transition-colors ${
                (disabled || isLoading) ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              style={{
                minHeight: '24px',
                maxHeight: '200px'
              }}
            />
          </div>
          {isLoading ? (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                onCancel();
              }}
              className="flex items-center justify-center rounded-lg p-2 h-[36px] w-[36px] flex-shrink-0 transition-colors bg-red-600 hover:bg-red-700 text-white"
              title="Stop generating"
            >
              <StopIcon className="w-5 h-5" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!message.trim() || disabled}
              className={`flex items-center justify-center rounded-lg p-2 h-[36px] w-[36px] flex-shrink-0 transition-all ${
                message.trim() && !disabled
                  ? insufficientBalance 
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-gray-600 text-gray-400'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <PaperAirplaneIcon className="w-5 h-5" />
            </button>
          )}
        </div>
        <div className="mt-2 space-y-1">
          <div className="text-xs text-gray-400 text-center flex items-center justify-center gap-2">
            {isLoading ? (
              <span className="flex items-center gap-1">
                <StopIcon className="w-3.5 h-3.5" /> Press <kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-xs">Esc</kbd> to cancel generation
              </span>
            ) : (
              <span className="flex items-center gap-1">
                Press <kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-xs">Enter</kbd> to send, <kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-xs">Shift</kbd> + <kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-xs">Enter</kbd> for new line
              </span>
            )}
          </div>
          <div className="flex items-center justify-center gap-1 pt-2 text-xs">
            <ShieldCheckIcon className="w-3.5 h-3.5" />
            <span className={`${isLocalModel ? 'text-green-400' : 'text-blue-400'}`}>
              {isLocalModel 
                ? 'This conversation is completely private, processed only by your local model'
                : 'Chat is anonymous. Avoid sharing sensitive data, passwords, or personal information'}
            </span>
          </div>
        </div>
      </div>
    </form>
  );
} 