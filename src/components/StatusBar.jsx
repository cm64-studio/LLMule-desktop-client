import React from 'react'
import { useNetwork } from '../contexts/NetworkContext'
import { Switch } from '@headlessui/react'

export default function StatusBar() {
  const { isConnected, connect, disconnect, isDetecting, localModels, sharingPreferences } = useNetwork()
  const hasModels = localModels?.length > 0 || false
  
  // Check if any models are selected for sharing
  const hasSelectedModels = React.useMemo(() => {
    if (!sharingPreferences) return hasModels; // Default to all models if no preferences
    return Object.values(sharingPreferences).some(selected => selected === true);
  }, [sharingPreferences, hasModels]);

  const toggleConnection = async () => {
    try {
      if (isConnected) {
        await disconnect();
      } else {
        if (!hasModels) {
          throw new Error('No local models detected. Please make sure your LLM service is running.');
        }
        
        if (!hasSelectedModels) {
          throw new Error('No models selected for sharing. Please select at least one model to share.');
        }
        
        await connect();
      }
    } catch (error) {
      console.error('Connection toggle error:', error);
      // Error is already handled in connect/disconnect functions
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-3">
        <span className="text-gray-400 text-sm">Share</span>
        <Switch
          checked={isConnected}
          onChange={toggleConnection}
          disabled={isDetecting || (!hasModels && !isConnected) || (!hasSelectedModels && !isConnected)}
          title={
            !hasModels && !isConnected 
              ? 'No models available to share' 
              : !hasSelectedModels && !isConnected
                ? 'No models selected for sharing'
                : isConnected
                  ? 'Click to stop sharing'
                  : 'Click to start sharing'
          }
          className={`${
            isConnected ? 'bg-green-600' : 'bg-gray-700'
          } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <span
            className={`${
              isConnected ? 'translate-x-6' : 'translate-x-1'
            } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
          />
        </Switch>
      </div>
    </div>
  )
}