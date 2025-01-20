const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const Store = require('electron-store')
const { setupAuthHandlers } = require('./auth/handlers')
const { setupLLMHandlers } = require('./llm/handlers')
const config = require('./config')

// Set up environment variables
process.env.NODE_ENV = process.env.NODE_ENV || 'development'
process.env.API_URL = config.API_URL
console.log('Using API URL:', process.env.API_URL)

const store = new Store()

let mainWindow = null

// Add this function before createWindow
function getIconPath() {
  if (process.platform === 'darwin') {
    return path.join(process.resourcesPath, 'assets', 'icon.icns')
  }
  return path.join(process.resourcesPath, 'assets', 'icon.png')
}

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 680,
    minWidth: 800,
    minHeight: 600,
    icon: getIconPath(), 
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'js')
    }
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile('dist/index.html')
  }

  // Make mainWindow available globally for event forwarding
  global.mainWindow = mainWindow
}

app.whenReady().then(() => {
  createWindow()
  setupAuthHandlers()
  setupLLMHandlers()
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

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