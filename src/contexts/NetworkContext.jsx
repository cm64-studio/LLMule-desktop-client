import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { toast } from 'react-hot-toast'
import axios from 'axios';

const NetworkContext = createContext()

export function NetworkProvider({ children }) {
  const [isConnected, setIsConnected] = useState(false)
  const [localModels, setLocalModels] = useState([])
  const [networkModels, setNetworkModels] = useState([])
  const [isDetecting, setIsDetecting] = useState(false)
  const [balance, setBalance] = useState(0)
  const [activity, setActivity] = useState([])
  const [downloadModelStatus, setDownloadModelStatus] = useState(null)
  const [downloadedModels, setDownloadedModels] = useState([])
  const [showModelSetup, setShowModelSetup] = useState(false)
  const [tokenStats, setTokenStats] = useState({
    tokensPerMinute: 0,
    tokensPerSecond: 0,
    lastUpdate: Date.now()
  })

  // Token stats calculation
  const updateTokenStats = useCallback((newActivity) => {
    if (!newActivity || !newActivity.tokens) return;
    
    setTokenStats(prev => {
      const now = Date.now();
      const timeWindow = 60000; // 1 minute in milliseconds
      const secondWindow = 1000; // 1 second in milliseconds
      
      // Calculate tokens per minute
      const tokensPerMinute = Math.round((newActivity.tokens.total || 0) * (timeWindow / (now - prev.lastUpdate)));
      
      // Calculate tokens per second
      const tokensPerSecond = Math.round((newActivity.tokens.total || 0) * (secondWindow / (now - prev.lastUpdate)));
      
      return {
        tokensPerMinute,
        tokensPerSecond,
        lastUpdate: now
      };
    });
  }, []);

  // Fetch models from the API with model comparison to prevent unnecessary updates
  const fetchNetworkModels = useCallback(async (silent = false) => {
    try {
      if (!silent) {
        console.log('Fetching network models...');
      }
      const apiKey = await window.electron.store.get('apiKey');
      const response = await axios.get(`${window.electron.config.API_URL}/v1/models`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json'
        }
      });
      
      if (response.data?.data) {
        // Compare new models with existing ones to prevent unnecessary updates
        const newModels = response.data.data;
        setNetworkModels(prevModels => {
          const hasChanges = JSON.stringify(prevModels) !== JSON.stringify(newModels);
          return hasChanges ? newModels : prevModels;
        });
      }
    } catch (error) {
      console.error('Failed to fetch network models:', error);
      if (!silent) {
        setNetworkModels([]);
      }
    }
  }, []);

  const detectLocalModels = useCallback(async (silent = false) => {
    if (!silent) {
      setIsDetecting(true);
    }
    try {
      // First check existing services
      const services = await window.electron.llm.detectServices();
      console.log('Detected services:', services);

      // Then check downloaded models
      const downloadedModelPaths = await window.electron.llm.getDownloadedModels();
      console.log('Downloaded models:', downloadedModelPaths);

      // Combine both into local models
      const allModels = [
        ...services,
        ...downloadedModelPaths.map(path => ({
          name: path.split('/').pop().replace('.gguf', ''),
          type: 'llama.cpp',
          path
        }))
      ];

      console.log('All local models:', allModels);
      
      setLocalModels(prevModels => {
        const hasChanges = JSON.stringify(prevModels) !== JSON.stringify(allModels);
        return hasChanges ? allModels : prevModels;
      });

    } catch (error) {
      console.error('Failed to detect local models:', error);
      if (!silent) {
        setLocalModels([]);
      }
    } finally {
      if (!silent) {
        setIsDetecting(false);
      }
    }
  }, []);

  const refreshModels = useCallback(async () => {
    console.log('Manually refreshing models...');
    setIsDetecting(true);
    await Promise.all([
      fetchNetworkModels(false),
      detectLocalModels(false)
    ]);
    setIsDetecting(false);
  }, [fetchNetworkModels, detectLocalModels]);

  // Check balance periodically with silent updates
  const checkBalance = useCallback(async (silent = true) => {
    try {
      const balanceData = await window.electron.auth.getBalance();
      if (!silent) {
        console.log('Balance data received:', balanceData);
      }
      if (balanceData && typeof balanceData.mule_balance !== 'undefined') {
        setBalance(balanceData.mule_balance);
      }
    } catch (error) {
      console.error('Failed to fetch balance:', error);
    }
  }, []);

  // Initialize and set up periodic checks
  useEffect(() => {
    console.log('NetworkProvider mounted, initializing...');
    
    // Initial checks
    refreshModels();
    checkBalance(false);
    
    // Add connection status listener
    window.electron.llm.onStatus(({ connected }) => {
      console.log('Connection status changed:', connected);
      setIsConnected(connected);
      if (!connected) {
        toast.error('Disconnected from network');
        // Reset token stats when disconnected
        setTokenStats({
          tokensPerMinute: 0,
          tokensPerSecond: 0,
          lastUpdate: Date.now()
        });
      }
    });

    // Add activity listener with token stats update
    window.electron.llm.onActivity((data) => {
      console.log('Activity:', data);
      setActivity(prev => [data, ...prev].slice(0, 50));
      updateTokenStats(data);
    });
    
    // Set up intervals for periodic checks with silent updates
    const balanceInterval = setInterval(() => checkBalance(true), 30000);
    const localModelInterval = setInterval(() => detectLocalModels(true), 30000);
    const networkModelInterval = setInterval(() => fetchNetworkModels(true), 30000);
    
    return () => {
      clearInterval(balanceInterval);
      clearInterval(localModelInterval);
      clearInterval(networkModelInterval);
    };
  }, [checkBalance, detectLocalModels, fetchNetworkModels, refreshModels, updateTokenStats]);

  const downloadModel = async (modelId) => {
    console.log('Starting download in NetworkContext:', modelId);
    
    const handleProgress = (data) => {
      console.log('Download progress:', data);
      if (data.modelId === modelId) {
        setDownloadModelStatus(prev => ({
          ...prev,
          modelId,
          progress: data.progress,
        }));
      }
    };
  
    const handleStatus = (data) => {
      console.log('Download status:', data);
      if (data.modelId === modelId) {
        setDownloadModelStatus(prev => ({
          ...prev,
          modelId,
          status: data.status,
        }));
      }
    };
  
    try {
      const result = await window.electron.llm.downloadModel(modelId, {
        onProgress: handleProgress,
        onStatusChange: handleStatus
      });
  
      console.log('Download result:', result);
  
      if (!result.success) {
        throw new Error(result.error || 'Download failed');
      }
  
      setDownloadedModels(prev => [...prev, modelId]);
      await detectLocalModels(false);
      return true;
    } catch (error) {
      console.error('Download error in NetworkContext:', error);
      setDownloadModelStatus(prev => ({
        ...prev,
        status: 'error',
        error: error.message
      }));
      return false;
    }
  };

  const connect = async () => {
    try {
      // If no downloaded models and no local services, show setup
      if (!downloadedModels.length && !localModels.length) {
        setShowModelSetup(true);
        return;
      }

      console.log('Connecting with models:', localModels);
      await window.electron.llm.connect(localModels);
      setIsConnected(true);
      toast.success('Connected to LLMule network');
      await checkBalance(false);
    } catch (error) {
      console.error('Connection error:', error);
      toast.error(error.message || 'Connection failed');
    }
  };

  const disconnect = async () => {
    try {
      await window.electron.llm.disconnect();
      setIsConnected(false);
      toast.success('Disconnected from network');
    } catch (error) {
      console.error('Disconnect error:', error);
      toast.error('Failed to disconnect from network');
    }
  };

  const value = {
    isConnected,
    setIsConnected,
    networkModels,
    models: networkModels,
    localModels,
    isDetecting,
    balance,
    activity: activity || [],
    tokenStats,
    refreshModels,
    connect,
    disconnect,
    downloadModel,
    downloadModelStatus,
    downloadedModels,
    showModelSetup,
    setShowModelSetup
  };

  return (
    <NetworkContext.Provider value={value}>
      {children}
    </NetworkContext.Provider>
  );
}

export const useNetwork = () => {
  const context = useContext(NetworkContext)
  if (!context) {
    throw new Error('useNetwork must be used within NetworkProvider')
  }
  return context
}