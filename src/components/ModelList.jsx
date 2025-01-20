import React from 'react'
import { useNetwork } from '../contexts/NetworkContext'
import { ArrowPathIcon } from '@heroicons/react/24/solid'

export default function ModelList() {
  const { localModels, isDetecting, detectServices } = useNetwork()

  return (
    <div className="flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl text-white">Local Available Models</h2>
        <button
          onClick={detectServices}
          disabled={isDetecting}
          className="px-3 py-1 rounded-md bg-gray-700 hover:bg-gray-600 text-gray-300 flex items-center gap-2 text-sm"
        >
          <ArrowPathIcon 
            className={`w-4 h-4 ${isDetecting ? 'animate-spin' : ''}`} 
          />
          <span>Refresh</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {localModels.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">⚠️</div>
            <p className="text-gray-400 mb-2">No Local LLM Services Detected</p>
            <p className="text-sm text-gray-500 mb-4">Install Ollama, LM Studio, EXO, or vLLM to share your models</p>
          </div>
        ) : (
          <div className="space-y-1">
            {localModels.map((model) => (
              <div 
                key={`${model.type}-${model.name}`}
                className="bg-gray-700/50 hover:bg-gray-700 transition-colors rounded-md p-3 flex justify-between items-center"
              >
                <div>
                  <h3 className="text-white font-mono text-sm">{model.name}</h3>
                  <p className="text-gray-400 text-xs">via {model.type}</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-gray-400 text-xs">Ready</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}