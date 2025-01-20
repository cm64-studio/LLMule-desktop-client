import React, { useState, useRef, useEffect } from 'react';
import { ChevronUpDownIcon, CheckIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { useNetwork } from '../../contexts/NetworkContext';

export default function ModelSelector({ models, selectedModelId, onModelChange, disabled }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const { refreshModels, isDetecting } = useNetwork();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedModel = models.find(m => m.id === selectedModelId);

  return (
    <div className="flex items-center gap-2 flex-1 max-w-2xl">
      <div className="relative flex-1" ref={dropdownRef}>
        <button
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={`w-full flex items-center justify-between gap-2 bg-gray-700/50 hover:bg-gray-700 text-white rounded-lg pl-3 pr-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
            isOpen ? 'ring-2 ring-blue-500' : ''
          }`}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="flex-shrink-0 w-3 h-3 rounded-full bg-gradient-to-br from-blue-400 to-blue-600" />
            <span className="truncate flex-1 text-left">{selectedModel?.id || 'Select a model'}</span>
            {selectedModel?.type === 'local' && (
              <span className="flex-shrink-0 px-1.5 py-0.5 text-xs bg-gray-600/50 text-gray-300 rounded">Local</span>
            )}
          </div>
          <ChevronUpDownIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
        </button>

        {isOpen && (
          <div className="absolute z-10 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-lg overflow-hidden">
            <div className="max-h-60 overflow-y-auto">
              {models.map((model) => (
                <button
                  key={model.id}
                  onClick={() => {
                    onModelChange(model.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-700 transition-colors ${
                    model.id === selectedModelId ? 'bg-gray-700/50' : ''
                  }`}
                >
                  <div className="flex-shrink-0 w-3 h-3 rounded-full bg-gradient-to-br from-blue-400 to-blue-600" />
                  <span className="flex-1 truncate text-left">{model.id}</span>
                  {model.type === 'local' && (
                    <span className="flex-shrink-0 px-1.5 py-0.5 text-xs bg-gray-600/50 text-gray-300 rounded">Local</span>
                  )}
                  {model.id === selectedModelId && (
                    <CheckIcon className="w-4 h-4 text-blue-500 flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      <button
        onClick={refreshModels}
        disabled={isDetecting || disabled}
        className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
        title="Refresh models"
      >
        <ArrowPathIcon className={`w-4 h-4 ${isDetecting ? 'animate-spin' : ''}`} />
      </button>
    </div>
  );
} 