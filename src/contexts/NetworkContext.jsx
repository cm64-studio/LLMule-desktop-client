import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { toast } from 'react-hot-toast'
import axios from 'axios';

const NetworkContext = createContext()

export const UIContext = createContext();

export function NetworkProvider({ children }) {
  const [isConnected, setIsConnected] = useState(false)
  const [localModels, setLocalModels] = useState([])
  const [networkModels, setNetworkModels] = useState([])
  const [isDetecting, setIsDetecting] = useState(false)
  const [balance, setBalance] = useState(0)
  const [activity, setActivity] = useState([])
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

  // Detect local LLM services with model comparison
  const detectLocalServices = useCallback(async (silent = false) => {
    if (!silent) {
      setIsDetecting(true);
    }
    try {
      const models = await window.electron.llm.detectServices();
      if (!silent) {
        console.log('Local models detected:', models);
      }
      
      // Compare new models with existing ones
      setLocalModels(prevModels => {
        const hasChanges = JSON.stringify(prevModels) !== JSON.stringify(models);
        return hasChanges ? models : prevModels;
      });
      
      if (models.length === 0 && isConnected) {
        await disconnect();
        if (!silent) {
          toast.error('Sharing disabled: No local LLM services detected');
        }
      }
    } catch (error) {
      console.error('Failed to detect local services:', error);
      if (!silent) {
        setLocalModels([]);
        if (isConnected) {
          await disconnect();
        }
      }
    } finally {
      if (!silent) {
        setIsDetecting(false);
      }
    }
  }, [isConnected]);

  const refreshModels = useCallback(async () => {
    console.log('Manually refreshing models...');
    setIsDetecting(true);
    await Promise.all([
      fetchNetworkModels(false),
      detectLocalServices(false)
    ]);
    setIsDetecting(false);
  }, [fetchNetworkModels, detectLocalServices]);

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
      
      // Check balance after our local LLM processes a network request (earning tokens)
      if (data.type === 'completion_success' && isConnected) {
        setTimeout(() => {
          checkBalance(true);
        }, 10000);
      }
    });
    
    // Set up intervals for periodic checks with silent updates
    const localModelInterval = setInterval(() => detectLocalServices(true), 30000);
    const networkModelInterval = setInterval(() => fetchNetworkModels(true), 60000);
    
    return () => {
      clearInterval(localModelInterval);
      clearInterval(networkModelInterval);
    };
  }, [checkBalance, detectLocalServices, fetchNetworkModels, refreshModels, updateTokenStats]);

  const connect = async () => {
    try {
      if (!localModels.length) {
        throw new Error('No local models detected. Please make sure your LLM service is running.');
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
    models: networkModels, // For backward compatibility
    localModels,
    isDetecting,
    balance,
    activity: activity || [], // Ensure activity is always an array
    tokenStats, // Add tokenStats to context value
    refreshModels,
    connect,
    disconnect,
    checkBalance // Add checkBalance to the context
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

export function UIProvider({ children }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const toggleSidebar = () => setIsSidebarOpen(prev => !prev);

  return (
    <UIContext.Provider value={{ isSidebarOpen, toggleSidebar }}>
      {children}
    </UIContext.Provider>
  );
}

export function useUI() {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
}