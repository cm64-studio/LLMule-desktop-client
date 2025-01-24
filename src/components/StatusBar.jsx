import React from 'react';
import { useNetwork } from '../contexts/NetworkContext';
import { Switch } from '@headlessui/react';
import ModelSetup from './model-setup/ModelSetup';

export default function StatusBar() {
  const { 
    isConnected, 
    connect, 
    disconnect, 
    isDetecting, 
    models,
    showModelSetup,
    setShowModelSetup
  } = useNetwork();
  
  const hasModels = models?.length > 0 || false;

  const toggleConnection = async () => {
    if (isConnected) {
      await disconnect();
    } else {
      await connect();
    }
  };

  return (
    <>
      <div className="flex items-center gap-3">
        <span className="text-gray-400 text-sm">Share</span>
        <Switch
          checked={isConnected}
          onChange={toggleConnection}
          disabled={isDetecting || (!hasModels && !isConnected)}
          title={!hasModels && !isConnected ? 'No models available to share' : ''}
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

      <ModelSetup 
        isOpen={showModelSetup} 
        onClose={() => setShowModelSetup(false)} 
      />
    </>
  );
}