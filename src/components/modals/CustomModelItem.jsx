import React from 'react';
import { TrashIcon, CogIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';

// Map of model types to their icons
const MODEL_TYPE_ICONS = {
  openai: '🟢',
  anthropic: '💜',
  deepseek: '🔍',
  custom: '🔌'
};

// Map of model types to display names
const MODEL_TYPE_NAMES = {
  openai: 'OpenAI API',
  anthropic: 'Claude API',
  deepseek: 'DeepSeek API',
  custom: 'Custom API'
};

export default function CustomModelItem({ model, onRefresh }) {
  const [isDeleting, setIsDeleting] = React.useState(false);
  
  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to delete "${model.name}"?`)) {
      setIsDeleting(true);
      try {
        await window.electron.llm.removeCustomModel(model.name);
        toast.success(`Removed model: ${model.name}`);
        onRefresh();
      } catch (error) {
        console.error('Failed to remove model:', error);
        toast.error('Failed to remove custom model');
      } finally {
        setIsDeleting(false);
      }
    }
  };
  
  const getModelTypeIcon = () => {
    if (!model.details?.modelType) return MODEL_TYPE_ICONS.custom;
    return MODEL_TYPE_ICONS[model.details.modelType] || MODEL_TYPE_ICONS.custom;
  };
  
  const getModelTypeName = () => {
    if (!model.details?.modelType) return MODEL_TYPE_NAMES.custom;
    return MODEL_TYPE_NAMES[model.details.modelType] || MODEL_TYPE_NAMES.custom;
  };
  
  const getModelDetails = () => {
    if (model.details?.externalModelId) {
      return model.details.externalModelId;
    }
    return model.name;
  };
  
  return (
    <div className="bg-gray-700/50 hover:bg-gray-700 transition-colors rounded-md p-3 flex justify-between items-center">
      <div className="flex items-center gap-3">
        <div className="text-xl">{getModelTypeIcon()}</div>
        <div>
          <h3 className="text-white font-medium text-sm">{model.name}</h3>
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-xs">{getModelTypeName()}</span>
            {model.details?.externalModelId && (
              <span className="text-gray-500 text-xs italic">({getModelDetails()})</span>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${
            model.details?.modelType === 'openai' ? 'bg-green-500' :
            model.details?.modelType === 'anthropic' ? 'bg-purple-500' :
            model.details?.modelType === 'deepseek' ? 'bg-blue-500' :
            'bg-gray-500'
          }`} />
          <span className="text-gray-400 text-xs">
            {model.details?.useAnthropicV1 ? 'Legacy' : 'Ready'}
          </span>
        </div>
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="text-gray-400 hover:text-red-500 disabled:opacity-50"
          title="Delete model"
        >
          {isDeleting ? (
            <span className="animate-spin h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full" />
          ) : (
            <TrashIcon className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );
} 