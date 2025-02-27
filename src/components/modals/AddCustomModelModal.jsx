import React, { useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, QuestionMarkCircleIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';

const MODEL_TYPES = [
  { id: 'custom', name: 'Custom Endpoint', logo: '🔌', description: 'Connect to other API-compatible LLM providers' },
  { id: 'openai', name: 'Chat Completion API', logo: '🟢', description: 'Connect to GPT-compatible models' },
  { id: 'anthropic', name: 'Claude-compatible API', logo: '💜', description: 'Connect to Claude-format models' },
];

// Example configurations for different model types
const MODEL_EXAMPLES = {
  custom: {
    baseUrl: 'https://your-api-endpoint.com/v1',
    modelId: 'your-model-name',
    apiKeyFormat: 'Your provider API key format'
  },
  openai: {
    baseUrl: 'https://api.openai.com/v1',
    modelId: 'gpt-4, gpt-3.5-turbo',
    apiKeyFormat: 'sk-...'
  },
  anthropic: {
    baseUrl: 'https://api.anthropic.com/v1',
    modelId: 'claude-3-opus, claude-3-sonnet',
    apiKeyFormat: 'sk-ant-...'
  }
};

export default function AddCustomModelModal({ isOpen, onClose, onAddModel }) {
  const [modelName, setModelName] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [selectedType, setSelectedType] = useState('openai');
  const [customModelId, setCustomModelId] = useState('');
  const [useAnthropicV1, setUseAnthropicV1] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTooltip, setShowTooltip] = useState('');

  // Set default values based on selected type
  React.useEffect(() => {
    if (selectedType === 'openai') {
      setBaseUrl('https://api.openai.com/v1');
    } else if (selectedType === 'anthropic') {
      setBaseUrl('https://api.anthropic.com/v1');
    } else {
      setBaseUrl('');
    }
    // Reset custom model ID when changing provider type
    setCustomModelId('');
  }, [selectedType]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!modelName.trim()) {
      toast.error('Please enter a model name');
      return;
    }
    
    if (!baseUrl.trim()) {
      toast.error('Please enter a base URL');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Create model configuration
      const modelConfig = {
        modelName: modelName.trim(),
        baseUrl: baseUrl.trim(),
        apiKey: apiKey.trim(),
        modelType: selectedType,
        useAnthropicV1,
        // For external model IDs (important for OpenAI/Claude)
        externalModelId: customModelId.trim() || modelName.trim()
      };
      
      // Add the model
      await window.electron.llm.addCustomModel(modelConfig);
      
      toast.success(`Added custom model: ${modelName}`);
      onAddModel(); // Callback to refresh model list
      resetForm();
      onClose();
    } catch (error) {
      console.error('Failed to add custom model:', error);
      toast.error('Failed to add custom model');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const resetForm = () => {
    setModelName('');
    setBaseUrl('');
    setApiKey('');
    setSelectedType('openai');
    setCustomModelId('');
    setUseAnthropicV1(false);
  };

  const Tooltip = ({ id, children }) => (
    <div 
      className={`absolute z-20 w-64 p-2 mt-1 text-sm text-white bg-gray-900 rounded-md shadow-lg ${showTooltip === id ? 'block' : 'hidden'}`}
      style={{ top: '100%', left: '0' }}
    >
      {children}
    </div>
  );

  return (
    <Transition show={isOpen} as={React.Fragment}>
      <Dialog as="div" className="relative z-10" onClose={onClose}>
        <Transition.Child
          as={React.Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <Transition.Child
              as={React.Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-gray-800 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
                <div className="flex justify-between items-center bg-gray-700 px-6 py-4">
                  <Dialog.Title as="h3" className="text-lg font-semibold text-white">
                    Add Custom LLM Model
                  </Dialog.Title>
                  <button
                    className="text-gray-400 hover:text-white"
                    onClick={onClose}
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>
                
                <form onSubmit={handleSubmit} className="p-4">
                  {/* Model Type Selection - Dropdown */}
                  <div className="mb-3">
                    <label htmlFor="modelType" className="block text-gray-300 text-sm font-medium mb-1">
                      Provider Type
                    </label>
                    <div className="relative">
                      <select
                        id="modelType"
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                        value={selectedType}
                        onChange={(e) => setSelectedType(e.target.value)}
                      >
                        {MODEL_TYPES.map((type) => (
                          <option key={type.id} value={type.id}>
                            {type.logo} {type.name}
                          </option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                        <svg className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                          <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  
                  {/* Combined Configuration Section */}
                  <div className="mb-4 border border-gray-700 rounded-md p-3">
                    
                    {/* Display Name */}
                    <div className="mb-3">
                      <label htmlFor="modelName" className="block text-gray-300 text-sm font-medium mb-1">
                        Display Name (required)
                      </label>
                      <input
                        type="text"
                        id="modelName"
                        className="w-full px-3 py-1.5 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g. My GPT-4 Model"
                        value={modelName}
                        onChange={(e) => setModelName(e.target.value)}
                        required
                      />
                      <p className="mt-0.5 text-xs text-gray-400">
                        This is how the model will appear in your model selection list
                      </p>
                    </div>
                    
                    {/* External Model ID (only show for OpenAI and Anthropic) */}
                    {(selectedType === 'openai' || selectedType === 'anthropic' || selectedType === 'custom') && (
                      <div className="mb-3 relative">
                        <div className="flex items-center">
                          <label htmlFor="customModelId" className="block text-gray-300 text-sm font-medium mb-1">
                            Model ID {selectedType !== 'custom' ? `(required)` : ''}
                          </label>
                          <button
                            type="button"
                            className="ml-1 text-gray-400 hover:text-gray-300"
                            onMouseEnter={() => setShowTooltip('modelId')}
                            onMouseLeave={() => setShowTooltip('')}
                          >
                            <QuestionMarkCircleIcon className="h-4 w-4" />
                          </button>
                        </div>
                        <input
                          type="text"
                          id="customModelId"
                          className="w-full px-3 py-1.5 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder={MODEL_EXAMPLES[selectedType].modelId}
                          value={customModelId}
                          onChange={(e) => setCustomModelId(e.target.value)}
                          required={selectedType === 'openai' || selectedType === 'anthropic'}
                        />
                        <p className="mt-0.5 text-xs text-gray-400">
                          The actual model identifier used by the API provider
                        </p>
                        <Tooltip id="modelId">
                          <p>This is the specific model identifier that the API provider uses.</p>
                          <p className="mt-1">Examples: {MODEL_EXAMPLES[selectedType].modelId}</p>
                        </Tooltip>
                      </div>
                    )}
                    
                    {/* Base URL */}
                    <div className="mb-3 relative">
                      <div className="flex items-center">
                        <label htmlFor="baseUrl" className="block text-gray-300 text-sm font-medium mb-1">
                          Base URL (required)
                        </label>
                        <button
                          type="button"
                          className="ml-1 text-gray-400 hover:text-gray-300"
                          onMouseEnter={() => setShowTooltip('baseUrl')}
                          onMouseLeave={() => setShowTooltip('')}
                        >
                          <QuestionMarkCircleIcon className="h-4 w-4" />
                        </button>
                      </div>
                      <input
                        type="text"
                        id="baseUrl"
                        className="w-full px-3 py-1.5 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder={MODEL_EXAMPLES[selectedType].baseUrl}
                        value={baseUrl}
                        onChange={(e) => setBaseUrl(e.target.value)}
                        required
                      />
                      <Tooltip id="baseUrl">
                        <p>The base URL for the API endpoint.</p>
                        <p className="mt-1">Default for {selectedType === 'openai' ? 'Chat Completion API' : selectedType === 'anthropic' ? 'Claude-compatible API' : 'Custom API'}: {MODEL_EXAMPLES[selectedType].baseUrl}</p>
                      </Tooltip>
                    </div>
                    
                    {/* API Key */}
                    <div className="mb-3 relative">
                      <div className="flex items-center">
                        <label htmlFor="apiKey" className="block text-gray-300 text-sm font-medium mb-1">
                          API Key {selectedType !== 'custom' ? '(required)' : ''}
                        </label>
                        <button
                          type="button"
                          className="ml-1 text-gray-400 hover:text-gray-300"
                          onMouseEnter={() => setShowTooltip('apiKey')}
                          onMouseLeave={() => setShowTooltip('')}
                        >
                          <QuestionMarkCircleIcon className="h-4 w-4" />
                        </button>
                      </div>
                      <input
                        type="password"
                        id="apiKey"
                        className="w-full px-3 py-1.5 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder={MODEL_EXAMPLES[selectedType].apiKeyFormat}
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        required={selectedType === 'openai' || selectedType === 'anthropic'}
                      />
                      <p className="mt-0.5 text-xs text-gray-400">
                        <span className="text-yellow-400">⚠️ Security Note:</span> Your API key is stored locally and encrypted. It is never shared with our servers.
                      </p>
                      <Tooltip id="apiKey">
                        <p>Your API key from the provider.</p>
                        <p className="mt-1">Format: {MODEL_EXAMPLES[selectedType].apiKeyFormat}</p>
                      </Tooltip>
                    </div>
                    
                    {/* Anthropic V1 API Compatibility */}
                    {selectedType === 'anthropic' && (
                      <div className="mb-0">
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            id="useAnthropicV1"
                            className="h-4 w-4 text-blue-500 focus:ring-blue-500 border-gray-600 rounded"
                            checked={useAnthropicV1}
                            onChange={(e) => setUseAnthropicV1(e.target.checked)}
                          />
                          <label htmlFor="useAnthropicV1" className="ml-2 block text-gray-300 text-sm">
                            Use Legacy API Format (v1)
                          </label>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5 ml-6">
                          Enable this if using the older API that requires "Human:" and "Assistant:" prefixes
                        </p>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      className="px-3 py-1.5 bg-gray-700 text-gray-300 rounded-md hover:bg-gray-600 transition-colors"
                      onClick={onClose}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={isSubmitting || !modelName.trim() || !baseUrl.trim() || 
                              ((selectedType === 'openai' || selectedType === 'anthropic') && 
                               (!apiKey.trim() || !customModelId.trim()))}
                    >
                      {isSubmitting ? (
                        <span className="flex items-center gap-2">
                          <span className="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full" />
                          Adding...
                        </span>
                      ) : (
                        'Add Model'
                      )}
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
} 