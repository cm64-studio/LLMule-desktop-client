const { contextBridge, ipcRenderer } = require('electron')

// Set up activity event listener
let activityCallback = null;
ipcRenderer.on('llm:activity', (_, data) => {
  if (activityCallback) activityCallback(data);
});

contextBridge.exposeInMainWorld('electron', {
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
    onActivity: (callback) => {
      activityCallback = callback;
    },
    onStatus: (callback) => {
      ipcRenderer.on('llm:status', (_, data) => callback(data));
    }
  }
})