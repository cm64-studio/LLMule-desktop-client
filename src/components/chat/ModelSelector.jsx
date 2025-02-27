import React, { useState, useRef, useEffect } from 'react';
import { ChevronUpDownIcon, CheckIcon, StarIcon as StarIconSolid, ServerIcon, MagnifyingGlassIcon, ArrowPathIcon } from '@heroicons/react/24/solid';
import { StarIcon } from '@heroicons/react/24/outline';
import { useNetwork } from '../../contexts/NetworkContext';
import { toast } from 'react-hot-toast';

// Move tierInfo to the top level
const tierInfo = {
  'xs': { label: 'XS', description: 'Minimal' },
  'small': { label: 'Small', description: 'Basic Tasks' },
  'medium': { label: 'Medium', description: 'Balanced' },
  'large': { label: 'Large', description: 'Powerful' },
  'xl': { label: 'XL', description: 'Advanced' },
  'xxl': { label: 'XXL', description: 'Ultimate' }
};

const ModelTierBars = ({ tier }) => {
  const tiers = {
    'xs': 1,
    'small': 2,
    'medium': 3,
    'large': 4,
    'xl': 5,
    'xxl': 6
  };

  const bars = tiers[tier] || 3;
  
  return (
    <div className="flex gap-0.5 items-end h-4">
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className={`w-1 ${i < bars ? 'bg-green-500' : 'bg-gray-600'}`}
          style={{ height: `${(i + 1) * 16.66}%` }}
        />
      ))}
    </div>
  );
};

const SpeedIndicator = ({ tokensPerSecond, successRate }) => {
  if (!tokensPerSecond || tokensPerSecond === 0) {
    return (
      <div className="text-gray-400 text-xs flex items-center gap-2">
        {successRate !== undefined && (
          <span className={getSuccessRateColor(successRate)}>⚡︎ {successRate}%</span>
        )}
      </div>
    );
  }

  let speedText = '⏲ Slow';
  let speedClass = 'text-red-400';
  if (tokensPerSecond > 100) {
    speedText = '⏲ Very Fast';
    speedClass = 'text-green-400';
  } else if (tokensPerSecond > 50) {
    speedText = '⏲ Fast';
    speedClass = 'text-yellow-400';
  } else if (tokensPerSecond > 20) {
    speedText = '⏲ Normal';
    speedClass = 'text-yellow-600';
  }

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className={speedClass}>{speedText}</span>
      {successRate !== undefined && (
        <span className={getSuccessRateColor(successRate)}>⚡︎ {successRate}%</span>
      )}
    </div>
  );
};

const getSuccessRateColor = (successRate) => {
  if (successRate >= 90) return 'text-green-400';
  if (successRate >= 80) return 'text-yellow-400';
  if (successRate >= 70) return 'text-yellow-600';
  return 'text-red-400';
};

const ContextLengthIndicator = ({ contextLength }) => {
  if (!contextLength) return null;
  
  const contextInK = Math.round(contextLength / 1024);
  let contextText = '';
  let contextClass = 'text-yellow-600';
  
  if (contextInK >= 128) {
    contextText = 'Very long context';
    contextClass = 'text-green-400';
  } else if (contextInK >= 32) {
    contextText = 'Long context';
    contextClass = 'text-green-400';
  } else if (contextInK >= 16) {
    contextText = 'Medium context';
    contextClass = 'text-yellow-400';
  }

  return (
    <span className={`text-xs ${contextClass}`}>
      {contextText}
    </span>
  );
};

const ModelItem = ({ model, isSelected, onSelect, isFavorite, onToggleFavorite }) => {
  const isLocal = model.type === 'local';
  const tokensPerSecond = model.provider?.avg_tokens_per_second;
  const successRate = model.provider?.success_rate;
  
  // For network models, use displayName or fall back to root or id
  // This handles cases where root might be an object instead of a string
  const displayName = isLocal 
    ? (model.name || model.id) 
    : (model.displayName || 
       (typeof model.root === 'string' ? model.root : 
        (model.root && model.root.name ? model.root.name : 
         (model.id && !model.id.includes('[object Object]') ? model.id.split('@')[0] : 'Unknown Model'))));
  
  // Get owner information, avoiding [object Object] in the display
  const owner = isLocal 
    ? null 
    : (model.provider?.user_id || 
       (model.owned_by && typeof model.owned_by === 'string' ? model.owned_by : null));

  return (
    <div
      className={`flex items-center justify-between p-3 hover:bg-gray-700/50 cursor-pointer ${
        isSelected ? 'bg-gray-700/50' : ''
      }`}
      onClick={() => onSelect(model)}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex-shrink-0">
          {isLocal ? (
            <ServerIcon className="w-5 h-5 text-blue-400" />
          ) : (
            <ModelTierBars tier={model.tier} />
          )}
        </div>
        
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium truncate">{displayName}</span>
            {owner && (
              <span className="text-xs text-gray-400">by {owner}</span>
            )}
          </div>
          
          <div className="flex items-center gap-3 text-sm">
            {!isLocal && (
              <>
                <SpeedIndicator 
                  tokensPerSecond={tokensPerSecond} 
                  successRate={successRate}
                />
                {/* <ContextLengthIndicator contextLength={model.context_length} /> */}
              </>
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

// const QuickTierSelect = ({ onSelect, availableTiers }) => {
//   return (
//     <div className="border-b border-gray-700">
//       <div className="px-3 py-2 text-xs font-medium text-gray-400 bg-gray-800/50">
//         Quick Select by Tier
//       </div>
//       <div className="p-1.5 flex flex-wrap gap-1.5">
//         {availableTiers.map(tier => (
//           <button
//             key={tier}
//             onClick={() => onSelect(tier)}
//             className="flex items-center gap-2 p-1.5 rounded bg-gray-700/50 hover:bg-gray-700 transition-colors flex-1 min-w-[100px] max-w-[150px]"
//           >
//             <ModelTierBars tier={tier} />
//             <div className="text-left">
//               <div className="text-sm font-medium">{tierInfo[tier]?.label || tier}</div>
//               <div className="text-xs text-gray-400">{tierInfo[tier]?.description}</div>
//             </div>
//           </button>
//         ))}
//       </div>
//     </div>
//   );
// };

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
      id: m.name || m.id, // Ensure we have an id from either name or id
      type: 'local' 
    })),
    ...networkModels
  ];

  const filteredModels = allModels.filter(model => {
    const searchTerm = searchQuery.toLowerCase();
    
    // Get the display name based on model type
    const displayName = model.type === 'local' 
      ? (model.name || model.id || '').toLowerCase()
      : (model.displayName || 
         (typeof model.root === 'string' ? model.root : 
          (model.root && model.root.name ? model.root.name : 
           (model.id && !model.id.includes('[object Object]') 
            ? model.id.split('@')[0] 
            : 'Unknown Model')))).toLowerCase();
    
    // Get owner information, avoiding [object Object] in the display
    const modelOwner = model.type === 'local'
      ? ''
      : (model.provider?.user_id || 
         (model.owned_by && typeof model.owned_by === 'string' ? model.owned_by : '')).toLowerCase();
    
    return displayName.includes(searchTerm) || modelOwner.includes(searchTerm);
  });

  const favoriteModels = filteredModels.filter(m => favorites.includes(m.id || m.name));
  const localModelsList = filteredModels.filter(m => m.type === 'local' && !favorites.includes(m.id || m.name));
  const networkModelsList = filteredModels.filter(m => m.type !== 'local' && !favorites.includes(m.id || m.name));

  // Find selected model
  const selectedModel = allModels.find(m => {
    // For local models, match by name or id
    if (m.type === 'local') {
      return (m.id === selectedModelId) || (m.name === selectedModelId);
    }
    // For network models, match by id
    return m.id === selectedModelId;
  });

  // Group network models by tier
  const networkModelsByTier = networkModelsList.reduce((acc, model) => {
    if (!acc[model.tier]) {
      acc[model.tier] = [];
    }
    acc[model.tier].push(model);
    return acc;
  }, {});

  const handleTierSelect = (tier) => {
    // When selecting a tier, we pass the tier directly as the model ID
    // The API will handle selecting an appropriate model of that tier
    onModelChange(tier);
    setIsOpen(false);
    setSearchQuery('');
    toast.success(`Selected ${tier} tier model`);
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
                  <ServerIcon className="w-4 h-4 text-blue-400 flex-shrink-0" />
                ) : (
                  <ModelTierBars tier={selectedModel.tier} />
                )}
                <span className="truncate flex-1 text-left">
                  {selectedModel.type === 'local' 
                    ? (selectedModel.name || selectedModel.id)
                    : (selectedModel.displayName || 
                       (typeof selectedModel.root === 'string' ? selectedModel.root : 
                        (selectedModel.root && selectedModel.root.name ? selectedModel.root.name : 
                         (selectedModel.id && !selectedModel.id.includes('[object Object]') 
                          ? selectedModel.id.split('@')[0] 
                          : 'Unknown Model')))
                      )
                  }
                </span>
                {selectedModel.type === 'local' && (
                  <span className="flex-shrink-0 px-1.5 py-0.5 text-xs bg-gray-600/50 text-gray-300 rounded">Local</span>
                )}
              </>
            ) : selectedModelId && ['xs', 'small', 'medium', 'large', 'xl', 'xxl'].includes(selectedModelId) ? (
              <>
                <ModelTierBars tier={selectedModelId} />
                <span className="truncate flex-1 text-left capitalize">{selectedModelId} Tier</span>
              </>
            ) : (
              <span className="text-gray-400">Select a model</span>
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

          <div className="max-h-[60vh] overflow-y-auto">
            {/* Favorites Section */}
            {favoriteModels.length > 0 && (
              <div>
                <div className="px-3 py-2 text-xs font-medium text-gray-400 bg-gray-800/50">
                  Favorites
                </div>
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
            )}

            {/* Local Models Section - Always First */}
            {localModelsList.length > 0 && (
              <div>
                <div className="px-3 py-2 text-xs font-medium text-gray-400 bg-gray-800/50">
                  Local Models
                </div>
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
            )}

            {/* Quick Tier Select - Only show if not searching */}
            {!searchQuery && networkModelsList.length > 0 && (
              <div>
                <div className="px-3 py-2 text-xs font-medium text-gray-400 bg-gray-800/50">
                  By Tier
                </div>
                <div className="p-1.5 flex flex-wrap gap-1.5">
                  {availableTiers.map(tier => (
                    <button
                      key={tier}
                      onClick={() => handleTierSelect(tier)}
                      className="flex items-center gap-2 p-1.5 rounded bg-gray-700/50 hover:bg-gray-700 transition-colors flex-1 min-w-[100px] max-w-[150px]"
                    >
                      <ModelTierBars tier={tier} />
                      <div className="text-left">
                        <div className="text-sm font-medium">{tierInfo[tier]?.label || tier}</div>
                        <div className="text-xs text-gray-400">{tierInfo[tier]?.description}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Network Models Section */}
            {networkModelsList.length > 0 && (
              <div>
                <div className="px-3 py-2 text-xs font-medium text-gray-400 bg-gray-800/50">
                  Network Models
                </div>
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
            )}

            {/* Empty State */}
            {filteredModels.length === 0 && (
              <div className="p-4 text-center text-gray-400">
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