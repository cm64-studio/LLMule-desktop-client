import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'path'
import Store from 'electron-store'
import { setupAuthHandlers } from './auth/handlers.js'
import { setupLLMHandlers } from './llm/handlers.js'
import config from './config.js'
import { fileURLToPath } from 'url'


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