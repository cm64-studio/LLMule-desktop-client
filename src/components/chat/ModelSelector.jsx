import React, { useState, useRef, useEffect } from 'react';
import { ChevronUpDownIcon, CheckIcon, StarIcon as StarIconSolid, MagnifyingGlassIcon, ArrowPathIcon } from '@heroicons/react/24/solid';
import { StarIcon, ComputerDesktopIcon, GlobeAltIcon } from '@heroicons/react/24/outline';
import { useNetwork } from '../../contexts/NetworkContext';
import { toast } from 'react-hot-toast';

// Simplified tier information with more intuitive labels
const tierInfo = {
  'xs': { label: 'Basic', description: 'Simple tasks', color: 'bg-gray-400' },
  'small': { label: 'Standard', description: 'Everyday use', color: 'bg-green-500' },
  'medium': { label: 'Enhanced', description: 'Better quality', color: 'bg-blue-500' },
  'large': { label: 'Advanced', description: 'Complex tasks', color: 'bg-purple-500' },
  'xl': { label: 'Professional', description: 'High performance', color: 'bg-pink-500' },
  'xxl': { label: 'Expert', description: 'Best quality', color: 'bg-red-500' }
};

// Simplified tier indicator
const ModelTierIndicator = ({ tier }) => {
  const tierColor = tierInfo[tier]?.color || 'bg-blue-500';
  
  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-2.5 h-2.5 rounded-full ${tierColor}`}></div>
      <span className="text-sm">{tierInfo[tier]?.label || 'Standard'}</span>
    </div>
  );
};

// Simplified speed indicator
const SpeedIndicator = ({ tokensPerSecond, successRate }) => {
  // If no data, don't show anything
  if (!tokensPerSecond && !successRate) return null;
  
  let speedLabel = 'Normal';
  let speedColor = 'text-yellow-400';
  let speedIcon = '⏱️';
  
  if (tokensPerSecond > 80) {
    speedLabel = 'Fast';
    speedColor = 'text-green-400';
    speedIcon = '⚡';
  } else if (tokensPerSecond < 20) {
    speedLabel = 'Slow';
    speedColor = 'text-red-400';
    speedIcon = '🐢';
  }

  return (
    <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-gray-700/50 text-xs">
      <span className={speedColor}>{speedIcon} {speedLabel}</span>
    </div>
  );
};

// Simplified model item
const ModelItem = ({ model, isSelected, onSelect, isFavorite, onToggleFavorite }) => {
  const isLocal = model.type === 'local';
  
  // Simplified display name logic
  const displayName = isLocal 
    ? (model.name || model.id) 
    : (model.displayName || model.id?.split('@')[0] || 'Network Model');
  
  // Simplified owner display
  const owner = !isLocal && model.provider?.user_id 
    ? model.provider.user_id 
    : null;

  return (
    <div
      className={`flex items-center justify-between p-3 hover:bg-gray-700 cursor-pointer rounded-lg transition-colors ${
        isSelected ? 'bg-gray-700 ring-1 ring-blue-500/50' : ''
      }`}
      onClick={() => onSelect(model)}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex-shrink-0">
          {isLocal ? (
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
              <ComputerDesktopIcon className="w-4 h-4 text-white" />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center">
              <GlobeAltIcon className="w-4 h-4 text-white" />
            </div>
          )}
        </div>
        
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium truncate">{displayName}</span>
            {isLocal && (
              <span className="px-1.5 py-0.5 text-xs bg-blue-600/20 text-blue-400 rounded-full">Local</span>
            )}
          </div>
          
          <div className="flex items-center gap-2 mt-1">
            {!isLocal && model.tier && (
              <ModelTierIndicator tier={model.tier} />
            )}
            {owner && (
              <span className="text-xs text-gray-400">by {owner}</span>
            )}
            {!isLocal && model.provider?.avg_tokens_per_second && (
              <SpeedIndicator 
                tokensPerSecond={model.provider.avg_tokens_per_second} 
                successRate={model.provider.success_rate}
              />
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(model);
          }}
          className="p-1 hover:bg-gray-600 rounded"
        >
          {isFavorite ? (
            <StarIconSolid className="w-4 h-4 text-yellow-500" />
          ) : (
            <StarIcon className="w-4 h-4 text-gray-400" />
          )}
        </button>
        
        {isSelected && <CheckIcon className="w-4 h-4 text-blue-500" />}
      </div>
    </div>
  );
};

// Main ModelSelector component
export default function ModelSelector({ selectedModelId, onModelChange, disabled }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);
  const { localModels, networkModels, isDetecting, refreshModels } = useNetwork();
  const [favorites, setFavorites] = useState(() => {
    const stored = localStorage.getItem('favorite_models');
    return stored ? JSON.parse(stored) : [];
  });

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const toggleFavorite = (model) => {
    setFavorites(prev => {
      const newFavorites = prev.includes(model.id)
        ? prev.filter(id => id !== model.id)
        : [...prev, model.id];
      
      localStorage.setItem('favorite_models', JSON.stringify(newFavorites));
      return newFavorites;
    });
  };

  // Combine and filter models based on search
  const allModels = [
    ...localModels.map(m => ({ 
      ...m, 
      id: m.name || m.id,
      type: 'local' 
    })),
    ...networkModels
  ];

  const filteredModels = allModels.filter(model => {
    const searchTerm = searchQuery.toLowerCase();
    const displayName = (model.type === 'local' 
      ? (model.name || model.id || '') 
      : (model.displayName || model.id?.split('@')[0] || 'Network Model')).toLowerCase();
    
    return displayName.includes(searchTerm);
  });

  const favoriteModels = filteredModels.filter(m => favorites.includes(m.id || m.name));
  const localModelsList = filteredModels.filter(m => m.type === 'local' && !favorites.includes(m.id || m.name));
  const networkModelsList = filteredModels.filter(m => m.type !== 'local' && !favorites.includes(m.id || m.name));

  // Find selected model
  const selectedModel = allModels.find(m => {
    if (m.type === 'local') {
      return (m.id === selectedModelId) || (m.name === selectedModelId);
    }
    return m.id === selectedModelId;
  });

  // Simplified tier selection
  const handleTierSelect = (tier) => {
    onModelChange(tier);
    setIsOpen(false);
    setSearchQuery('');
    toast.success(`Selected ${tierInfo[tier]?.label || tier} model`);
  };

  // Get unique available tiers from network models
  const availableTiers = [...new Set(networkModels.map(m => m.tier))].sort((a, b) => {
    const tierOrder = { 'xs': 0, 'small': 1, 'medium': 2, 'large': 3, 'xl': 4, 'xxl': 5 };
    return tierOrder[a] - tierOrder[b];
  });

  return (
    <div className="relative flex-1" ref={dropdownRef}>
      <div className="flex gap-2">
        <button
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={`flex-1 flex items-center justify-between gap-2 bg-gray-700/50 hover:bg-gray-700 text-white rounded-lg pl-3 pr-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
            isOpen ? 'ring-2 ring-blue-500' : ''
          }`}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {selectedModel ? (
              <>
                {selectedModel.type === 'local' ? (
                  <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center">
                    <ComputerDesktopIcon className="w-3 h-3 text-white" />
                  </div>
                ) : (
                  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center">
                    <GlobeAltIcon className="w-3 h-3 text-white" />
                  </div>
                )}
                <span className="truncate flex-1 text-left">
                  {selectedModel.type === 'local' 
                    ? (selectedModel.name || selectedModel.id)
                    : (selectedModel.displayName || selectedModel.id?.split('@')[0] || 'Network Model')
                  }
                </span>
                {selectedModel.type === 'local' && (
                  <span className="flex-shrink-0 px-1.5 py-0.5 text-xs bg-blue-600/20 text-blue-400 rounded-full">Local</span>
                )}
              </>
            ) : selectedModelId && tierInfo[selectedModelId] ? (
              <>
                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center">
                  <div className={`w-2.5 h-2.5 rounded-full ${tierInfo[selectedModelId].color}`}></div>
                </div>
                <span className="truncate flex-1 text-left">{tierInfo[selectedModelId].label} Model</span>
              </>
            ) : (
              <div className="flex items-center gap-2 text-gray-400">
                <MagnifyingGlassIcon className="w-4 h-4" />
                <span>Select a model to start chatting</span>
              </div>
            )}
          </div>
          <ChevronUpDownIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
        </button>

        <button
          onClick={refreshModels}
          disabled={isDetecting || disabled}
          className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
          title="Refresh models"
        >
          <ArrowPathIcon className={`w-4 h-4 ${isDetecting ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-lg overflow-hidden">
          {/* Search Input */}
          <div className="p-2 border-b border-gray-700">
            <div className="relative">
              <MagnifyingGlassIcon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search models..."
                className="w-full bg-gray-700 text-white placeholder-gray-400 rounded-md pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="max-h-[60vh] overflow-y-auto p-2 space-y-2">
            {/* Favorites Section */}
            {favoriteModels.length > 0 && (
              <div className="bg-gray-800/70 rounded-lg overflow-hidden">
                <div className="px-3 py-2 text-xs font-medium text-gray-300 bg-gray-700/50 border-l-2 border-yellow-500">
                  Favorites
                </div>
                <div className="p-1 space-y-1">
                  {favoriteModels.map((model) => (
                    <ModelItem
                      key={model.id}
                      model={model}
                      isSelected={model.id === selectedModelId || model.name === selectedModelId}
                      onSelect={(model) => {
                        onModelChange(model.name || model.id);
                        setIsOpen(false);
                        setSearchQuery('');
                      }}
                      isFavorite={favorites.includes(model.id || model.name)}
                      onToggleFavorite={toggleFavorite}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Local Models Section */}
            {localModelsList.length > 0 && (
              <div className="bg-gray-800/70 rounded-lg overflow-hidden">
                <div className="px-3 py-2 text-xs font-medium text-gray-300 bg-gray-700/50 border-l-2 border-blue-500 flex items-center gap-2">
                  <ComputerDesktopIcon className="w-3.5 h-3.5" />
                  Your Local Models
                </div>
                <div className="p-1 space-y-1">
                  {localModelsList.map((model) => (
                    <ModelItem
                      key={model.id}
                      model={model}
                      isSelected={model.id === selectedModelId || model.name === selectedModelId}
                      onSelect={(model) => {
                        onModelChange(model.name || model.id);
                        setIsOpen(false);
                        setSearchQuery('');
                      }}
                      isFavorite={favorites.includes(model.id || model.name)}
                      onToggleFavorite={toggleFavorite}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Quality Levels - Only show if not searching */}
            {!searchQuery && networkModelsList.length > 0 && availableTiers.length > 0 && (
              <div className="bg-gray-800/70 rounded-lg overflow-hidden">
                <div className="px-3 py-2 text-xs font-medium text-gray-300 bg-gray-700/50 border-l-2 border-purple-500">
                  Quality Levels
                </div>
                <div className="p-2 grid grid-cols-3 gap-2">
                  {availableTiers.map(tier => (
                    <button
                      key={tier}
                      onClick={() => handleTierSelect(tier)}
                      className="flex items-center gap-2 p-2 rounded-lg bg-gray-700/50 hover:bg-gray-700 transition-colors"
                    >
                      <div className={`w-6 h-6 rounded-full ${tierInfo[tier]?.color || 'bg-blue-500'} bg-opacity-20 flex items-center justify-center flex-shrink-0`}>
                        <div className={`w-3 h-3 rounded-full ${tierInfo[tier]?.color || 'bg-blue-500'}`}></div>
                      </div>
                      <div className="text-left min-w-0">
                        <div className="text-sm font-medium truncate">{tierInfo[tier]?.label || tier}</div>
                        <div className="text-xs text-gray-400 truncate">{tierInfo[tier]?.description}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Network Models Section */}
            {networkModelsList.length > 0 && (
              <div className="bg-gray-800/70 rounded-lg overflow-hidden">
                <div className="px-3 py-2 text-xs font-medium text-gray-300 bg-gray-700/50 border-l-2 border-green-500 flex items-center gap-2">
                  <GlobeAltIcon className="w-3.5 h-3.5" />
                  Shared Network Models
                </div>
                <div className="p-1 space-y-1">
                  {networkModelsList.map((model) => (
                    <ModelItem
                      key={model.id}
                      model={model}
                      isSelected={model.id === selectedModelId}
                      onSelect={() => {
                        onModelChange(model.id);
                        setIsOpen(false);
                        setSearchQuery('');
                      }}
                      isFavorite={favorites.includes(model.id || model.name)}
                      onToggleFavorite={toggleFavorite}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {filteredModels.length === 0 && (
              <div className="p-4 text-center text-gray-400 bg-gray-800/50 rounded-lg">
                {searchQuery ? (
                  <p className="text-sm">No models found matching "{searchQuery}"</p>
                ) : (
                  <>
                    <p className="text-sm">No models available</p>
                    {isDetecting && (
                      <p className="text-xs mt-1">Detecting models...</p>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 