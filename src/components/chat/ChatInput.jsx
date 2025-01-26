import React, { useState, useRef, useEffect } from 'react';
import { PaperAirplaneIcon, StopIcon } from '@heroicons/react/24/solid';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';

export default function ChatInput({ 
  onSend, 
  onCancel,
  disabled, 
  isLoading = false,
  placeholder = "Type a message...",
  insufficientBalance = false,
  balanceInfo = null
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

  return (
    <form onSubmit={handleSubmit} className="bg-gray-800 p-4">
      <div className="max-w-3xl mx-auto">
        <div className={`flex items-end gap-2 bg-gray-700 rounded-xl p-2 ${insufficientBalance ? 'border border-red-500/50' : ''}`}>
          <div className="flex-1 min-w-0">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setHasFocus(true)}
              onBlur={() => setHasFocus(false)}
              placeholder={insufficientBalance ? "Insufficient balance. Please share models or contact us." : placeholder}
              rows={1}
              disabled={disabled || isLoading}
              className={`w-full bg-transparent text-white px-3 py-2 focus:outline-none resize-none transition-colors ${
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
              className="flex items-center justify-center rounded-lg p-2 h-[36px] w-[36px] flex-shrink-0 transition-colors bg-gray-600 hover:bg-gray-500 text-white"
              title="Stop generating"
            >
              <StopIcon className="w-5 h-5" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!message.trim() || disabled}
              className={`flex items-center justify-center rounded-lg p-2 h-[36px] w-[36px] flex-shrink-0 transition-colors ${
                message.trim() && !disabled
                  ? insufficientBalance 
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'text-gray-400'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <PaperAirplaneIcon className="w-5 h-5" />
            </button>
          )}
        </div>
        <div className="mt-2 text-xs text-gray-400 text-center">
          {isLoading ? 'Press Stop to cancel generation' : 'Press Enter to send, Shift + Enter for new line'}
        </div>
      </div>
    </form>
  );
} 