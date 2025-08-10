const { contextBridge, ipcRenderer, shell } = require('electron')
// Try to import ollama module, but don't fail if it's not available yet
let ollama;
try {
  ollama = require('./ollama/index.js');
} catch (error) {
  console.log('Ollama module not loaded:', error.message);
  // Create dummy implementations to prevent errors
  ollama = {
    isInstalled: () => Promise.resolve(false),
    isRunning: () => Promise.resolve(false),
    install: () => Promise.reject(new Error('Ollama module not available')),
    start: () => Promise.reject(new Error('Ollama module not available')),
    stop: () => Promise.reject(new Error('Ollama module not available')),
    listModels: () => Promise.resolve([]),
    pullModel: () => Promise.reject(new Error('Ollama module not available')),
    removeModel: () => Promise.reject(new Error('Ollama module not available'))
  };
}

// Use environment variables set from config.js
const config = {
  API_URL: process.env.API_URL || 'http://localhost:3000',
  WS_URL: process.env.WS_URL || 'ws://localhost:3000/llm-network'
}

// Set up activity event listener
let activityCallback = null;
ipcRenderer.on('llm:activity', (_, data) => {
  if (activityCallback) activityCallback(data);
});

// Stream callbacks by request ID
const streamCallbacks = new Map();

contextBridge.exposeInMainWorld('electron', {
  config,
  store: {
    get: (key) => ipcRenderer.invoke('store:get', key),
    set: (key, value) => ipcRenderer.invoke('store:set', key, value),
  },
  app: {
    getVersion: () => ipcRenderer.invoke('app:getVersion')
  },
  auth: {
    register: (email) => ipcRenderer.invoke('auth:register', email),
    checkVerification: () => ipcRenderer.invoke('auth:checkVerification'),
    getStatus: () => ipcRenderer.invoke('auth:getStatus'),
    getBalance: () => ipcRenderer.invoke('auth:getBalance')
  },
  llm: {
    detectServices: () => ipcRenderer.invoke('llm:detect'),
    getModels: () => ipcRenderer.invoke('llm:models'),
    connect: (models) => ipcRenderer.invoke('llm:connect', models),
    disconnect: () => ipcRenderer.invoke('llm:disconnect'),
    chat: (params) => {
      // Set up streaming event listener if needed
      if (params.onUpdate && params.stream !== false) {
        const { requestId } = params;
        
        // Store the callback
        streamCallbacks.set(requestId, params.onUpdate);
        
        // Set up the listener for this request
        const listener = (_, data) => {
          const callback = streamCallbacks.get(requestId);
          if (callback) callback(data);
        };
        
        // Listen for stream updates
        ipcRenderer.on(`llm:stream:${requestId}`, listener);
        
        // Clean up when done
        const cleanupListener = () => {
          ipcRenderer.removeListener(`llm:stream:${requestId}`, listener);
          streamCallbacks.delete(requestId);
        };

        // Create a serializable version of params (without the callback function)
        const serializedParams = { ...params };
        delete serializedParams.onUpdate; // Remove non-serializable function
        
        // Send the request and clean up when done
        return ipcRenderer.invoke('llm:chat', serializedParams)
          .then(result => {
            cleanupListener();
            return result;
          })
          .catch(error => {
            cleanupListener();
            throw error;
          });
      }
      
      // Regular non-streaming request
      return ipcRenderer.invoke('llm:chat', params);
    },
    cancel: (requestId) => ipcRenderer.invoke('llm:cancel', requestId),
    addCustomModel: (modelConfig) => ipcRenderer.invoke('llm:addCustomModel', modelConfig),
    removeCustomModel: (modelName) => ipcRenderer.invoke('llm:removeCustomModel', modelName),
    onActivity: (callback) => {
      activityCallback = callback;
    },
    onStatus: (callback) => {
      ipcRenderer.on('llm:status', (_, data) => callback(data));
    }
  },
  system: {
    onSuspend: (callback) => ipcRenderer.on('system:suspend', () => callback()),
    onResume: (callback) => ipcRenderer.on('system:resume', () => callback()),
    onUnlock: (callback) => ipcRenderer.on('system:unlock', () => callback()),
    getPlatformInfo: () => ipcRenderer.invoke('system:getPlatformInfo')
  },
  // Utility to open external links
  shell: {
    openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url)
  },
  ollama: {
    isInstalled: () => ipcRenderer.invoke('ollama:isInstalled'),
    isRunning: () => ipcRenderer.invoke('ollama:isRunning'),
    install: (platform, arch, progressCallback) => {
      // Set up progress event listener
      ipcRenderer.on('ollama:installProgress', (_, progress) => {
        if (progressCallback) progressCallback(progress);
      });
      
      return ipcRenderer.invoke('ollama:install', platform, arch);
    },
    start: () => ipcRenderer.invoke('ollama:start'),
    stop: () => ipcRenderer.invoke('ollama:stop'),
    listModels: () => ipcRenderer.invoke('ollama:listModels'),
    pullModel: (modelName, progressCallback) => {
      // Set up progress event listener
      ipcRenderer.on('ollama:pullProgress', (_, progress) => {
        if (progressCallback) progressCallback(progress);
      });
      
      return ipcRenderer.invoke('ollama:pullModel', modelName);
    },
    removeModel: (modelName) => ipcRenderer.invoke('ollama:removeModel', modelName)
  }
})