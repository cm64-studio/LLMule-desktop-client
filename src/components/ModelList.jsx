import React, { useState, useEffect } from 'react'
import { useNetwork } from '../contexts/NetworkContext'
import { ArrowPathIcon, PlusIcon } from '@heroicons/react/24/solid'
import AddCustomModelModal from './modals/AddCustomModelModal'
import CustomModelItem from './modals/CustomModelItem'

// Toggle Switch Component
const ToggleSwitch = ({ isChecked, onChange, id }) => {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-400">Share</span>
      <label htmlFor={id} className="relative inline-flex items-center cursor-pointer">
        <input 
          type="checkbox" 
          id={id} 
          className="sr-only" 
          checked={isChecked} 
          onChange={onChange}
        />
        <div className={`w-9 h-5 rounded-full transition-colors ${isChecked ? 'bg-blue-600' : 'bg-gray-600'}`}>
          <div 
            className={`absolute top-0.5 left-0.5 bg-white w-4 h-4 rounded-full transition-transform ${isChecked ? 'translate-x-4' : 'translate-x-0'}`}
          />
        </div>
      </label>
    </div>
  );
};

export default function ModelList() {
  const { localModels, isDetecting, refreshModels, isConnected, updateSharingPreferences, sharingPreferences } = useNetwork()
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [selectedModels, setSelectedModels] = useState({})
  
  // Filter models by type
  const standardModels = localModels.filter(model => model.type !== 'custom')
  const customModels = localModels.filter(model => model.type === 'custom')

  // Initialize selected models from sharing preferences
  useEffect(() => {
    if (sharingPreferences) {
      setSelectedModels(sharingPreferences);
    } else {
      // By default, select all models
      const initialSelection = {};
      localModels.forEach(model => {
        initialSelection[`${model.type}-${model.name}`] = true;
      });
      setSelectedModels(initialSelection);
      
      // Save initial preferences
      if (localModels.length > 0) {
        updateSharingPreferences(initialSelection);
      }
    }
  }, [localModels, sharingPreferences, updateSharingPreferences]);

  const handleModelSelectionChange = (modelKey, isSelected) => {
    const updatedSelection = {
      ...selectedModels,
      [modelKey]: isSelected
    };
    
    // Check if this change would result in no models being shared
    const wouldHaveSelectedModels = Object.values(updatedSelection).some(selected => selected === true);
    
    if (isConnected && !wouldHaveSelectedModels) {
      // Warn user that this will disconnect from the network
      if (window.confirm('Turning off sharing for all models will disconnect you from the network. Continue?')) {
        setSelectedModels(updatedSelection);
        updateSharingPreferences(updatedSelection);
      }
    } else {
      // Normal update
      setSelectedModels(updatedSelection);
      updateSharingPreferences(updatedSelection);
      
      // If connected, apply changes immediately by reconnecting
      if (isConnected) {
        // Small delay to allow state to update
        setTimeout(() => {
          refreshModels();
        }, 100);
      }
    }
  };

  return (
    <div className="flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl text-white">Local Available Models</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-3 py-1 rounded-md bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-2 text-sm"
          >
            <PlusIcon className="w-4 h-4" />
            <span>Add Custom</span>
          </button>
          <button
            onClick={refreshModels}
            disabled={isDetecting}
            className="px-3 py-1 rounded-md bg-gray-700 hover:bg-gray-600 text-gray-300 flex items-center gap-2 text-sm"
          >
            <ArrowPathIcon 
              className={`w-4 h-4 ${isDetecting ? 'animate-spin' : ''}`} 
            />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
      {standardModels.length === 0 && customModels.length === 0 ? (
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

            <div className="mt-6">
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-2 mx-auto"
              >
                <PlusIcon className="w-5 h-5" />
                <span>Add Custom LLM</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Clarification message */}
            <div className="mb-4 p-3 bg-blue-900/30 border border-blue-800 rounded-md">
              <p className="text-sm text-blue-200">
                Select which models you want to share with the LLMule network. Toggle the switch to enable or disable sharing for each model.
                {isConnected ? " Changes to model sharing will apply immediately." : " Click the Share toggle to start sharing."}
              </p>
            </div>
            
            {/* Display custom models with a heading if any exist */}
            {customModels.length > 0 && (
              <>
                <h3 className="text-sm font-medium text-gray-400 pb-1 border-b border-gray-700">Custom Models</h3>
                <div className="space-y-2 mb-4">
                  {customModels.map((model) => (
                    <div key={`custom-${model.name}`} className="flex items-center gap-3">
                      <div className="flex-1">
                        <CustomModelItem 
                          model={model}
                          onRefresh={refreshModels}
                        />
                      </div>
                      <div>
                        <ToggleSwitch
                          id={`share-custom-${model.name}`}
                          isChecked={selectedModels[`${model.type}-${model.name}`] || false}
                          onChange={(e) => handleModelSelectionChange(`${model.type}-${model.name}`, e.target.checked)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
            
            {/* Display standard models with a heading if any exist */}
            {standardModels.length > 0 && (
              <>
                <h3 className="text-sm font-medium text-gray-400 pb-1 border-b border-gray-700">Detected Models</h3>
                <div className="space-y-2">
                  {standardModels.map((model) => (
                    <div 
                      key={`${model.type}-${model.name}`}
                      className="flex items-center gap-3"
                    >
                      <div className="flex-1 bg-gray-700/50 hover:bg-gray-700 transition-colors rounded-md p-3 flex justify-between items-center">
                        <div>
                          <h3 className="text-white font-mono text-sm">{model.name}</h3>
                          <p className="text-gray-400 text-xs">via {model.type}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-green-500" />
                          <span className="text-gray-400 text-xs">Ready</span>
                        </div>
                      </div>
                      <div>
                        <ToggleSwitch
                          id={`share-${model.type}-${model.name}`}
                          isChecked={selectedModels[`${model.type}-${model.name}`] || false}
                          onChange={(e) => handleModelSelectionChange(`${model.type}-${model.name}`, e.target.checked)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <AddCustomModelModal 
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddModel={refreshModels}
      />
    </div>
  )
}