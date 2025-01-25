const { contextBridge, ipcRenderer } = require('electron')

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

contextBridge.exposeInMainWorld('electron', {
  config,
  store: {
    get: (key) => ipcRenderer.invoke('store:get', key),
    set: (key, value) => ipcRenderer.invoke('store:set', key, value),
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
    chat: (params) => ipcRenderer.invoke('llm:chat', params),
    onActivity: (callback) => {
      activityCallback = callback;
    },
    onStatus: (callback) => {
      ipcRenderer.on('llm:status', (_, data) => callback(data));
    }
  }
})