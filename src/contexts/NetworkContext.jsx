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
  const [wasConnected, setWasConnected] = useState(false)
  const [isReconnecting, setIsReconnecting] = useState(false)
  const [lastDisconnectToast, setLastDisconnectToast] = useState(null)
  const [sharingPreferences, setSharingPreferences] = useState(null)
  const [tokenStats, setTokenStats] = useState({
    tokensPerMinute: 0,
    tokensPerSecond: 0,
    lastUpdate: Date.now()
  })
  const [isConnecting, setIsConnecting] = useState(false)

  // Load sharing preferences from localStorage
  useEffect(() => {
    try {
      const storedPreferences = localStorage.getItem('llmule_sharing_preferences');
      if (storedPreferences) {
        setSharingPreferences(JSON.parse(storedPreferences));
      }
    } catch (error) {
      console.error('Failed to load sharing preferences:', error);
    }
  }, []);

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
  const fetchNetworkModels = useCallback(async (showToast = true) => {
    try {
      const apiKey = await window.electron.store.get('apiKey');
      if (!apiKey) {
        console.log('No API key found, skipping network models fetch');
        return;
      }
      
      const response = await axios.get(`${window.electron.config.API_URL}/v1/models`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json'
        },
        // Add timeout to prevent hanging requests
        timeout: 10000
      });
      
      if (response.data?.data) {
        // Sanitize the model data before setting it in state
        const sanitizedModels = response.data.data.map(model => {
          // Create a copy of the model to avoid modifying the original
          const sanitizedModel = { ...model };
          
          // Ensure model has a displayName
          if (!sanitizedModel.displayName) {
            // If root is a string, use it as displayName
            if (typeof sanitizedModel.root === 'string') {
              sanitizedModel.displayName = sanitizedModel.root;
            } 
            // If id is available, extract the model part (before @)
            else if (sanitizedModel.id) {
              const idParts = sanitizedModel.id.split('@');
              sanitizedModel.displayName = idParts[0] !== '[object Object]' ? idParts[0] : 'Unknown Model';
            }
            // Fallback to name or unknown
            else {
              sanitizedModel.displayName = sanitizedModel.name || 'Unknown Model';
            }
          }
          
          return sanitizedModel;
        });
        
        console.log('Sanitized network models:', sanitizedModels);
        
        // Compare new models with existing ones to prevent unnecessary updates
        setNetworkModels(prevModels => {
          const hasChanges = JSON.stringify(prevModels) !== JSON.stringify(sanitizedModels);
          return hasChanges ? sanitizedModels : prevModels;
        });
      }
    } catch (error) {
      console.error('Failed to fetch network models:', error);
      
      // Handle specific error cases
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.log('Server error status:', error.response.status);
        console.log('Server error data:', error.response.data);
      } else if (error.request) {
        // The request was made but no response was received
        console.log('No response received:', error.request);
      } else {
        // Something happened in setting up the request that triggered an Error
        console.log('Request setup error:', error.message);
      }
      
      if (showToast) {
        toast.error('Failed to fetch network models');
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
        console.log('No local models detected, disconnecting from network...');
        // Use a function reference instead of calling disconnect directly
        const disconnectFromNetwork = async () => {
          try {
            await window.electron.llm.disconnect();
            setIsConnected(false);
            if (!silent) {
              toast.error('Model sharing disabled: No local LLM services detected');
            }
          } catch (error) {
            console.error('Disconnect error:', error);
          }
        };
        
        await disconnectFromNetwork();
      }
    } catch (error) {
      console.error('Failed to detect local services:', error);
      if (!silent) {
        setLocalModels([]);
        if (isConnected) {
          try {
            await window.electron.llm.disconnect();
            setIsConnected(false);
          } catch (disconnectError) {
            console.error('Disconnect error:', disconnectError);
          }
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
    
    try {
      // Run these in sequence instead of parallel to avoid race conditions
      await detectLocalServices(false);
      
      // Always fetch network models regardless of connection status
      try {
        await fetchNetworkModels(false);
      } catch (error) {
        console.error('Error fetching network models:', error);
      }
    } catch (error) {
      console.error('Error refreshing models:', error);
      toast.error('Failed to refresh models. Please try again.');
    } finally {
      setIsDetecting(false);
    }
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

  // Define connect and disconnect functions first
  const disconnect = useCallback(async () => {
    try {
      await window.electron.llm.disconnect();
      setIsConnected(false);
      toast.success('Model sharing turned off');
    } catch (error) {
      console.error('Disconnect error:', error);
      toast.error('Failed to turn off model sharing');
    }
  }, []);

  const connect = useCallback(async () => {
    try {
      console.log('Connect called, local models:', localModels);
      
      // Check for API key first
      const apiKey = await window.electron.store.get('apiKey');
      if (!apiKey) {
        throw new Error('API key not found. Please set up your API key in settings.');
      }
      
      // Make sure we have the latest models
      if (localModels.length === 0) {
        console.log('No local models in state, attempting to refresh...');
        await detectLocalServices(false);
      }
      
      // Get the latest localModels from state after refresh
      const currentLocalModels = [...localModels]; // Create a copy to avoid reference issues
      console.log('Current local models after refresh:', currentLocalModels);
      
      if (!currentLocalModels || currentLocalModels.length === 0) {
        throw new Error('No local models detected. Please make sure your LLM service is running.');
      }

      // Filter models based on sharing preferences
      let modelsToShare = [...currentLocalModels]; 
      const currentSharingPreferences = sharingPreferences;
      
      // If we have sharing preferences, use them
      if (currentSharingPreferences) {
        modelsToShare = currentLocalModels.filter(model => {
          const modelKey = `${model.type}-${model.name}`;
          return currentSharingPreferences[modelKey] === true;
        });
      } 
      // Otherwise, by default, share all models
      else {
        // Create default sharing preferences that select all models
        const defaultPreferences = {};
        currentLocalModels.forEach(model => {
          defaultPreferences[`${model.type}-${model.name}`] = true;
        });
        
        // Update sharing preferences
        setSharingPreferences(defaultPreferences);
        try {
          localStorage.setItem('llmule_sharing_preferences', JSON.stringify(defaultPreferences));
        } catch (error) {
          console.error('Failed to save default sharing preferences:', error);
        }
      }
      
      // Final check to make sure we have models to share
      if (modelsToShare.length === 0) {
        throw new Error('No models selected for sharing. Please select at least one model to share.');
      }

      console.log('Connecting with models:', modelsToShare);
      const result = await window.electron.llm.connect(modelsToShare);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to turn on model sharing');
      }
      
      setIsConnected(true);
      toast.success('Model sharing turned on');
      
      // Fetch network models after successful connection
      setTimeout(() => {
        fetchNetworkModels(false);
        checkBalance(false);
      }, 1000);
    } catch (error) {
      console.error('Connection error:', error);
      setIsConnected(false); // Ensure connection state is reset on error
      toast.error(error.message || 'Failed to turn on model sharing');
    }
  }, [localModels, sharingPreferences, detectLocalServices, checkBalance, fetchNetworkModels]);

  // Now define updateSharingPreferences after disconnect is defined
  const updateSharingPreferences = useCallback((preferences) => {
    setSharingPreferences(preferences);
    try {
      localStorage.setItem('llmule_sharing_preferences', JSON.stringify(preferences));
      
      // Check if any models are selected for sharing
      const hasSelectedModels = Object.values(preferences).some(isSelected => isSelected === true);
      
      // If connected but no models are selected, automatically disconnect
      if (isConnected && !hasSelectedModels) {
        console.log('No models selected for sharing, disconnecting from network...');
        disconnect();
        toast.info('Model sharing disabled: No models selected');
      }
    } catch (error) {
      console.error('Failed to save sharing preferences:', error);
    }
  }, [isConnected, disconnect]);

  // Separate useEffect for initial model refresh
  useEffect(() => {
    console.log('Initial model refresh...');
    refreshModels();
    
    // Also explicitly fetch network models on mount
    fetchNetworkModels(false).catch(error => {
      console.error('Initial network models fetch failed:', error);
    });
  }, [refreshModels, fetchNetworkModels]);

  // Initialize and set up periodic checks
  useEffect(() => {
    console.log('NetworkProvider mounted, initializing...');
    
    // Initial checks - moved to a separate useEffect
    checkBalance(false);
    
    // Add connection status listener
    window.electron.llm.onStatus(({ connected }) => {
      console.log('Connection status changed:', connected);
      setIsConnected(connected);
      
      if (connected) {
        setWasConnected(true);
        setIsReconnecting(false);
        // Clear any existing disconnect toast when we successfully connect
        if (lastDisconnectToast) {
          toast.dismiss(lastDisconnectToast);
          setLastDisconnectToast(null);
        }
      } else {
        // Only show disconnect toast if we're not already showing one
        // and we're not in the middle of a reconnection attempt
        if (!lastDisconnectToast && !isReconnecting) {
          const toastId = toast.error('Model sharing stopped', {
            duration: 3000, // Show for 3 seconds
            id: 'network-disconnect', // Unique ID to prevent duplicates
          });
          setLastDisconnectToast(toastId);
          
          // Clear the toast ID after it's dismissed
          setTimeout(() => {
            setLastDisconnectToast(null);
          }, 3000);
        }
        
        // Reset token stats when disconnected
        setTokenStats({
          tokensPerMinute: 0,
          tokensPerSecond: 0,
          lastUpdate: Date.now()
        });
      }
    });

    // System event handlers
    const handleSuspend = () => {
      console.log('System suspending, saving connection state...');
      setWasConnected(isConnected);
      if (isConnected) {
        disconnect();
      }
    };

    const handleResume = async () => {
      console.log('System resuming, checking previous state...', { wasConnected });
      if (wasConnected) {
        console.log('Attempting to restore connection...');
        setIsReconnecting(true);
        // Wait a bit for network to be available
        setTimeout(async () => {
          try {
            // First check if we have an API key
            const apiKey = await window.electron.store.get('apiKey');
            if (!apiKey) {
              console.error('No API key found, cannot reconnect');
              setIsReconnecting(false);
              return;
            }
            
            // Refresh models first
            await detectLocalServices(false);
            
            // Now we can just use the connect function as it handles sharing preferences
            try {
              await connect();
            } catch (error) {
              console.error('Failed to reconnect:', error);
              toast.error('Failed to reconnect to network. Please try again manually.');
              setIsReconnecting(false);
            }
          } catch (error) {
            console.error('Failed to restore connection:', error);
            toast.error('Failed to restore connection. Please try again manually.');
            setIsReconnecting(false);
          }
        }, 5000);
      }
    };

    const handleUnlock = async () => {
      console.log('Screen unlocked, refreshing state...');
      refreshModels();
    };

    // Add system event listeners
    window.electron.system.onSuspend(handleSuspend);
    window.electron.system.onResume(handleResume);
    window.electron.system.onUnlock(handleUnlock);

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
    const networkModelInterval = setInterval(() => {
      // Always fetch network models regardless of connection status
      fetchNetworkModels(true);
    }, 60000);
    
    return () => {
      clearInterval(localModelInterval);
      clearInterval(networkModelInterval);
    };
  }, [checkBalance, detectLocalServices, fetchNetworkModels, refreshModels, updateTokenStats, connect, disconnect]);

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
    checkBalance, // Add checkBalance to the context
    sharingPreferences,
    updateSharingPreferences
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