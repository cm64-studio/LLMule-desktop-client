import React, { createContext, useContext, useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'

const NetworkContext = createContext()

export function NetworkProvider({ children }) {
  const [isConnected, setIsConnected] = useState(false)
  const [models, setModels] = useState([])
  const [activeModels, setActiveModels] = useState([])
  const [balance, setBalance] = useState(0)
  const [activity, setActivity] = useState([])
  const [isDetecting, setIsDetecting] = useState(false)
  const [tokenStats, setTokenStats] = useState({ tokensPerMinute: 0, tokensPerSecond: 0 })

  useEffect(() => {
    detectServices();
    checkBalance();
    
    // Add connection status listener
    window.electron.llm.onStatus(({ connected }) => {
      setIsConnected(connected);
      if (!connected) {
        toast.error('Disconnected from network');
      }
    });
    
    const balanceInterval = setInterval(checkBalance, 30000);
    const modelInterval = setInterval(checkModels, 5000);
    
    window.electron.llm.onActivity((data) => {
      setActivity(prev => {
        const newActivity = [data, ...prev].slice(0, 50);
        updateTokenStats(newActivity);
        return newActivity;
      });
    });

    return () => {
      clearInterval(balanceInterval);
      clearInterval(modelInterval);
    };
  }, []);

  // Check for model changes
  const checkModels = async () => {
    if (isDetecting) return; // Skip if already detecting

    try {
      const newModels = await window.electron.llm.detectServices()
      
      // Compare with current models
      const currentModelKeys = models.map(m => `${m.type}-${m.name}`).sort().join(',')
      const newModelKeys = newModels.map(m => `${m.type}-${m.name}`).sort().join(',')
      
      if (currentModelKeys !== newModelKeys) {
        console.log('Models changed. Current:', models, 'New:', newModels)
        setModels(newModels)
        
        // If connected and models changed or no models available, handle appropriately
        if (isConnected) {
          if (newModels.length === 0) {
            console.log('Disconnecting due to no available models')
            await disconnect()
            toast.error('Sharing disabled: No LLM services available')
          } else {
            console.log('Reconnecting due to model changes')
            await disconnect()
            await connect()
          }
        }
      }
    } catch (error) {
      console.error('Failed to check models:', error)
      // Disconnect on error if connected
      if (isConnected) {
        await disconnect()
        toast.error('Sharing disabled: Failed to detect LLM services')
      }
    }
  }

  const updateTokenStats = (activities) => {
    const now = Date.now();
    const lastMinute = now - 60000;
    const recentActivities = activities.filter(
      act => act.timestamp > lastMinute && act.type === 'completion_success'
    );

    const totalTokens = recentActivities.reduce(
      (sum, act) => sum + (act.tokens?.total_tokens || 0), 
      0
    );

    // Calculate tokens per second first
    const tokensPerSecond = totalTokens / 60;
    
    setTokenStats({
      tokensPerMinute: Math.round(tokensPerSecond * 60),
      tokensPerSecond: tokensPerSecond.toFixed(1)
    });
  }

  const checkBalance = async () => {
    try {
      const balanceData = await window.electron.auth.getBalance()
      console.log('Balance data received:', balanceData)
      if (balanceData && typeof balanceData.mule_balance !== 'undefined') {
        console.log('Setting new balance:', balanceData.mule_balance)
        setBalance(balanceData.mule_balance)
      } else {
        console.warn('Invalid balance data received:', balanceData)
      }
    } catch (error) {
      console.error('Failed to fetch balance:', error)
    }
  }

  const detectServices = async () => {
    setIsDetecting(true)
    try {
      const models = await window.electron.llm.detectServices()
      setModels(models)
      
      // If no models detected and we're connected, disconnect
      if (models.length === 0 && isConnected) {
        await disconnect()
        toast.error('Sharing disabled: No LLM services detected')
      } else {
        toast.success(`Found ${models.length} models`)
      }
    } catch (error) {
      toast.error('Failed to detect LLM services')
      // Also disconnect on error if connected
      if (isConnected) {
        await disconnect()
      }
    } finally {
      setIsDetecting(false)
    }
  }

  const connect = async () => {
    try {
      if (!models.length) {
        throw new Error('No models detected. Please make sure your LLM service is running.');
      }

      // Validate models have required properties
      const invalidModels = models.filter(m => !m.name || !m.type);
      if (invalidModels.length > 0) {
        throw new Error('Some models are invalid. Please try detecting models again.');
      }

      console.log('Connecting with models:', models);
      await window.electron.llm.connect(models);
      setIsConnected(true);
      toast.success('Connected to LLMule network');
      // Check balance immediately after connection
      await checkBalance();
    } catch (error) {
      console.error('Connection error:', error);
      toast.error(error.message || 'Connection failed');
    }
  }

  const disconnect = async () => {
    try {
      await window.electron.llm.disconnect()
      setIsConnected(false)
      toast.success('Disconnected from network')
    } catch (error) {
      console.error('Disconnect error:', error)
      toast.error('Failed to disconnect from network')
    }
  }

  const value = {
    isConnected,
    models,
    activeModels,
    balance,
    activity,
    isDetecting,
    tokenStats,
    detectServices,
    connect,
    disconnect
  }

  return (
    <NetworkContext.Provider value={value}>
      {children}
    </NetworkContext.Provider>
  )
}

export const useNetwork = () => {
  const context = useContext(NetworkContext)
  if (!context) {
    throw new Error('useNetwork must be used within NetworkProvider')
  }
  return context
}