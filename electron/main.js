import { app, BrowserWindow, ipcMain, powerMonitor } from 'electron'
import path from 'path'
import Store from 'electron-store'
import { setupAuthHandlers } from './auth/handlers.js'
import { setupLLMHandlers } from './llm/handlers.js'
import { setupAppHandlers } from './app/handlers.js'
import config from './config.js'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Environment setup
process.env.NODE_ENV = process.env.NODE_ENV || 'development'
process.env.API_URL = config.API_URL
process.env.WS_URL = config.WS_URL
console.log('Using API URL:', process.env.API_URL)
console.log('Using WS URL:', process.env.WS_URL)

const store = new Store()
let mainWindow = null

// Import Ollama module dynamically
let ollama = null;
const ollamaPath = path.join(__dirname, 'ollama', 'index.cjs');

// Load Ollama module asynchronously
async function loadOllamaModule() {
  if (fs.existsSync(ollamaPath)) {
    try {
      // Use createRequire for better CommonJS compatibility in ESM context
      const { createRequire } = await import('module');
      const require = createRequire(import.meta.url);
      ollama = require('./ollama/index.cjs');
      global.ollama = ollama; // Make it globally accessible
      console.log('Ollama module loaded successfully');
    } catch (error) {
      console.log('Failed to load Ollama module:', error.message);
      ollama = null;
    }
  } else {
    console.log(`Ollama module not found at path: ${ollamaPath}`);
  }
}

// Add this function before createWindow
function getIconPath() {
  if (process.platform === 'darwin') {
    return path.join(process.resourcesPath, 'assets', 'icon.icns')
  }
  return path.join(process.resourcesPath, 'assets', 'icon.png')
}

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    icon: getIconPath(),
    show: false,
    backgroundColor: '#111827',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile('dist/index.html')
  }

  global.mainWindow = mainWindow
}

const setupApp = async () => {
  try {
    // Load Ollama module first
    await loadOllamaModule();
    
    // Setup basic handlers first
    setupAuthHandlers();
    setupLLMHandlers();
    setupAppHandlers();
    
    // Setup power monitor events
    powerMonitor.on('suspend', () => {
      console.log('System suspending...');
      global.mainWindow?.webContents.send('system:suspend');
    });

    powerMonitor.on('resume', () => {
      console.log('System resuming...');
      global.mainWindow?.webContents.send('system:resume');
    });

    powerMonitor.on('unlock-screen', () => {
      console.log('Screen unlocked...');
      global.mainWindow?.webContents.send('system:unlock');
    });
  } catch (error) {
    console.error('Failed to initialize handlers:', error);
  }
};

app.whenReady().then(() => {
  createWindow();
  setupApp().catch(console.error);
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Clean up when quitting
app.on('will-quit', async (event) => {
  event.preventDefault(); // Prevent immediate quitting
  
  try {
    
    // Continue with app quit
    app.exit(0);
  } catch (error) {
    console.error('Error during cleanup:', error);
    app.exit(1);
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// IPC Handlers
ipcMain.handle('store:get', (_, key) => {
  return store.get(key)
})

ipcMain.handle('store:set', (_, key, value) => {
  store.set(key, value)
  return true
})

// System platform info
ipcMain.handle('system:getPlatformInfo', () => {
  return {
    os: process.platform,
    arch: process.arch
  };
});

// Ollama handlers - register these always, using mock implementations as fallbacks
// Create a wrapper for the ollama module to handle cases where it's not available
const ollamaWrapper = {
  isInstalled: async () => {
    if (ollama && typeof ollama.isInstalled === 'function') {
      try {
        return await ollama.isInstalled();
      } catch (error) {
        console.error('Error calling ollama.isInstalled:', error);
        return false;
      }
    }
    console.log('Using mock implementation for isInstalled');
    return false;
  },
  
  isRunning: async () => {
    if (ollama && typeof ollama.isRunning === 'function') {
      try {
        return await ollama.isRunning();
      } catch (error) {
        console.error('Error calling ollama.isRunning:', error);
        return false;
      }
    }
    console.log('Using mock implementation for isRunning');
    return false;
  },
  
  install: async (platform, arch, progressCallback) => {
    if (ollama && typeof ollama.install === 'function') {
      try {
        return await ollama.install(platform, arch, progressCallback);
      } catch (error) {
        console.error('Error calling ollama.install:', error);
        throw error;
      }
    }
    console.log('Using mock implementation for install');
    // Use our mock implementation
    // Simulate download progress
    for (let i = 0; i <= 100; i += 10) {
      if (progressCallback) {
        progressCallback(i);
      }
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    return true;
  },
  
  start: async () => {
    if (ollama && typeof ollama.start === 'function') {
      try {
        return await ollama.start();
      } catch (error) {
        console.error('Error calling ollama.start:', error);
        throw error;
      }
    }
    console.log('Using mock implementation for start');
    return true;
  },
  
  stop: async () => {
    if (ollama && typeof ollama.stop === 'function') {
      try {
        return await ollama.stop();
      } catch (error) {
        console.error('Error calling ollama.stop:', error);
        throw error;
      }
    }
    console.log('Using mock implementation for stop');
    return true;
  },
  
  listModels: async () => {
    if (ollama && typeof ollama.listModels === 'function') {
      try {
        return await ollama.listModels();
      } catch (error) {
        console.error('Error calling ollama.listModels:', error);
        return [];
      }
    }
    console.log('Using mock implementation for listModels');
    return [
      {
        name: 'llama3:8b',
        size: 4200000000, // ~4.2GB
      },
      {
        name: 'mistral:7b',
        size: 3800000000, // ~3.8GB
      }
    ];
  },
  
  pullModel: async (modelName, progressCallback) => {
    if (ollama && typeof ollama.pullModel === 'function') {
      try {
        return await ollama.pullModel(modelName, progressCallback);
      } catch (error) {
        console.error('Error calling ollama.pullModel:', error);
        throw error;
      }
    }
    console.log('Using mock implementation for pullModel');
    // Simulate download progress
    for (let i = 0; i <= 100; i += 5) {
      if (progressCallback) {
        progressCallback(i);
      }
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    return true;
  },
  
  removeModel: async (modelName) => {
    if (ollama && typeof ollama.removeModel === 'function') {
      try {
        return await ollama.removeModel(modelName);
      } catch (error) {
        console.error('Error calling ollama.removeModel:', error);
        throw error;
      }
    }
    console.log('Using mock implementation for removeModel');
    return true;
  }
};

// Register the Ollama handlers - always register these regardless of module availability
ipcMain.handle('ollama:isInstalled', async () => {
  return await ollamaWrapper.isInstalled();
});

ipcMain.handle('ollama:isRunning', async () => {
  return await ollamaWrapper.isRunning();
});

ipcMain.handle('ollama:install', async (event, platform, arch) => {
  try {
    return await ollamaWrapper.install(platform, arch, (progress) => {
      event.sender.send('ollama:installProgress', progress);
    });
  } catch (error) {
    console.error('Error in ollama:install:', error);
    throw error;
  }
});

ipcMain.handle('ollama:start', async () => {
  try {
    return await ollamaWrapper.start();
  } catch (error) {
    console.error('Error in ollama:start:', error);
    throw error;
  }
});

ipcMain.handle('ollama:stop', async () => {
  try {
    return await ollamaWrapper.stop();
  } catch (error) {
    console.error('Error in ollama:stop:', error);
    throw error;
  }
});

ipcMain.handle('ollama:listModels', async () => {
  try {
    return await ollamaWrapper.listModels();
  } catch (error) {
    console.error('Error in ollama:listModels:', error);
    return [];
  }
});

ipcMain.handle('ollama:pullModel', async (event, modelName) => {
  try {
    return await ollamaWrapper.pullModel(modelName, (progress) => {
      event.sender.send('ollama:pullProgress', progress);
    });
  } catch (error) {
    console.error('Error in ollama:pullModel:', error);
    throw error;
  }
});

ipcMain.handle('ollama:removeModel', async (event, modelName) => {
  try {
    return await ollamaWrapper.removeModel(modelName);
  } catch (error) {
    console.error('Error in ollama:removeModel:', error);
    throw error;
  }
});