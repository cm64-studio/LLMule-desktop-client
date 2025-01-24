import React from 'react';
import { ArrowDownIcon, ServerIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';

export default function ModelCard({ 
  model, 
  isSelected,
  status,
  progress,
  error,
  onSelect 
}) {
  return (
    <div 
      className={`bg-gray-800 p-4 rounded-lg border-2 transition-colors ${
        isSelected ? 'border-blue-500' : 'border-transparent hover:border-gray-700'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="font-medium">{model.name}</h3>
            <span className="text-sm">{model.rating}</span>
          </div>
          <p className="text-sm text-gray-400">{model.description}</p>
          
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <div className="flex items-center gap-1">
              <ServerIcon className="w-4 h-4" />
              <span>{model.size}</span>
            </div>
          </div>
        </div>

        {isSelected ? (
          <div className="w-32">
            {status === 'downloading' && (
              <>
                <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-sm text-center mt-1">
                  Downloading... {progress}%
                </p>
              </>
            )}
            
            {status === 'setting-up' && (
              <div className="text-center">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent mx-auto" />
                <p className="text-sm mt-1">Setting up...</p>
              </div>
            )}
            
            {status === 'ready' && (
              <div className="text-center text-green-500">
                <CheckCircleIcon className="w-5 h-5 mx-auto" />
                <p className="text-sm mt-1">Ready!</p>
              </div>
            )}
            
            {status === 'error' && (
              <div className="text-center text-red-500">
                <XCircleIcon className="w-5 h-5 mx-auto" />
                <p className="text-xs mt-1">{error}</p>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={() => onSelect(model)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <ArrowDownIcon className="w-4 h-4" />
            Download
          </button>
        )}
      </div>
    </div>
  );
}