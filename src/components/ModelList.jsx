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
      
      // Update sharing preferences
      if (Object.keys(initialSelection).length > 0) {
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
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-xl text-white">Local Available Models</h2>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md text-sm transition-colors"
          >
            <PlusIcon className="w-4 h-4" />
            Add Custom
          </button>
          <button
            onClick={refreshModels}
            disabled={isDetecting}
            className={`p-2 rounded-md ${isDetecting ? 'bg-gray-700 text-gray-500' : 'bg-gray-700 hover:bg-gray-600 text-white'} transition-colors`}
            title="Refresh Models"
          >
            <ArrowPathIcon className={`w-4 h-4 ${isDetecting ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
      
      
      <div className="bg-gray-750 border border-gray-700 rounded-md p-3 mb-4">
        <p className="text-sm text-gray-300">
          Select which models you want to share with the LLMule network. 
          Toggle the switch to enable or disable sharing for each model.
          Changes to model sharing will apply immediately.
        </p>
      </div>
      
      <div className="flex-1 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
        {/* Custom Models */}
        {customModels.length > 0 && (
          <div className="mb-4">
            <h3 className="text-base font-medium text-white mb-2 bg-gray-750 px-3 py-1.5 rounded-t-md border-b border-gray-700">
              Custom Models
            </h3>
            <div className="space-y-2">
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
          </div>
        )}
        
        {/* Standard Models */}
        {standardModels.length > 0 && (
          <div>
            <h3 className="text-base font-medium text-white mb-2 bg-gray-750 px-3 py-1.5 rounded-t-md border-b border-gray-700">
              Detected Models
            </h3>
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
          </div>
        )}
        
        {/* Empty State */}
        {localModels.length === 0 && !isDetecting && (
          <div className="text-center py-8 bg-gray-800/30 rounded-lg border border-gray-700/50">
            <p className="text-gray-400">No local models detected</p>
            <p className="text-sm text-gray-500 mt-2">
              Please make sure your LLM service is running
            </p>
            <div className="mt-4 flex justify-center gap-2">
              <button
                onClick={refreshModels}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm transition-colors"
              >
                Check Again
              </button>
            </div>
          </div>
        )}
        
        {/* Loading State */}
        {isDetecting && (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-blue-500"></div>
            <span className="ml-3 text-gray-400">Detecting models...</span>
          </div>
        )}
      </div>
      
      {/* Modals */}
      <AddCustomModelModal 
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddModel={refreshModels}
      />
      
    </div>
  )
}