import React, { useState } from 'react'
import { useNetwork } from '../contexts/NetworkContext'
import { ArrowPathIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/solid'
import { Switch } from '@headlessui/react'

export default function ModelList() {
  const { localModels, isDetecting, detectServices, connect, disconnect, isConnected } = useNetwork()
  const [selectedModels, setSelectedModels] = useState(localModels.map(m => m.name))

  const handleModelToggle = (modelName) => {
    setSelectedModels(prev => {
      const newSelection = prev.includes(modelName)
        ? prev.filter(name => name !== modelName)
        : [...prev, modelName]
      
      // If we're connected, we need to reconnect with the new selection
      if (isConnected) {
        const selectedModelObjects = localModels.filter(m => newSelection.includes(m.name))
        disconnect().then(() => {
          if (selectedModelObjects.length > 0) {
            connect(selectedModelObjects)
          }
        })
      }
      
      return newSelection
    })
  }

  const handleShareToggle = (enabled) => {
    if (enabled) {
      const selectedModelObjects = localModels.filter(m => selectedModels.includes(m.name))
      if (selectedModelObjects.length > 0) {
        connect(selectedModelObjects)
      }
    } else {
      disconnect()
    }
  }

  return (
    <div className="flex flex-col">
      <div className="flex justify-between items-center mb-3">
        <div>
          <h2 className="text-xl text-white">Local LLMs</h2>
          <p className="text-sm text-gray-400">LLMule automatically detects running LLM services</p>
        </div>
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
          <div className="text-center py-6">
            <div className="mb-4">
              <h3 className="text-lg font-medium text-white mb-2">⚡︎ Share your compute power ⚡︎</h3>
              <p className="text-sm text-gray-400 max-w-md mx-auto mb-1">
                Got GPUs? Join the decentralized AI revolution by sharing local LLMs
              </p>
              <p className="text-sm text-gray-400 max-w-md mx-auto">
                Run any of these services and LLMule will detect them automatically
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-2 text-sm text-gray-300 mb-4">
              <span className="px-3 py-1 bg-gray-800/50 rounded-lg">・Ollama</span>
              <span className="px-3 py-1 bg-gray-800/50 rounded-lg">・LM Studio</span>
              <span className="px-3 py-1 bg-gray-800/50 rounded-lg">・vLLM</span>
              <span className="px-3 py-1 bg-gray-800/50 rounded-lg">・EXO</span>
            </div>

            
          </div>
        ) : (
          <div className="space-y-3">
            {/* Global share toggle */}
            <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
              <div>
                <h3 className="font-medium text-white text-sm">Share Models</h3>
                <p className="text-xs text-gray-400">
                  {isConnected ? 'Currently sharing with network' : 'Start sharing your models'}
                </p>
              </div>
              <Switch
                checked={isConnected}
                onChange={handleShareToggle}
                className={`${
                  isConnected ? 'bg-blue-600' : 'bg-gray-700'
                } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900`}
              >
                <span className="sr-only">Share models</span>
                <span
                  className={`${
                    isConnected ? 'translate-x-6' : 'translate-x-1'
                  } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                />
              </Switch>
            </div>

            {/* Model list with individual toggles */}
            <div className="space-y-2">
              {localModels.map((model) => (
                <div 
                  key={`${model.type}-${model.name}`}
                  className="bg-gray-800/50 hover:bg-gray-800 transition-colors rounded-lg p-3 flex justify-between items-center"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-white font-mono text-sm">{model.name}</h3>
                      <span className="px-2 py-0.5 text-xs bg-gray-700 text-gray-300 rounded-full">
                        {model.type}
                      </span>
                    </div>
                    <p className="text-gray-400 text-xs mt-1">
                      {selectedModels.includes(model.name) 
                        ? isConnected ? 'Currently sharing' : 'Ready to share'
                        : 'Not sharing'}
                    </p>
                  </div>
                  <Switch
                    checked={selectedModels.includes(model.name)}
                    onChange={() => handleModelToggle(model.name)}
                    className={`${
                      selectedModels.includes(model.name) ? 'bg-blue-600' : 'bg-gray-700'
                    } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900`}
                  >
                    <span className="sr-only">Share {model.name}</span>
                    <span
                      className={`${
                        selectedModels.includes(model.name) ? 'translate-x-6' : 'translate-x-1'
                      } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                    />
                  </Switch>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}