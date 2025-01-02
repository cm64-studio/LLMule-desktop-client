import { ipcMain } from 'electron'
import { ModelDetector } from './detector'
import { NetworkClient } from './network'

let networkClient = null;
const detector = new ModelDetector();

export function setupLLMHandlers() {
  ipcMain.handle('llm:detect', async () => {
    return await detector.detectAll();
  });

  ipcMain.handle('llm:connect', async (_, models) => {
    try {
      if (!networkClient) networkClient = new NetworkClient();
      if (!models || !models.length) {
        throw new Error('No models provided for connection');
      }
      await networkClient.connect(models);
      return { success: true };
    } catch (error) {
      console.error('Connection failed:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('llm:disconnect', async () => {
    try {
      if (networkClient) {
        await networkClient.disconnect();
        networkClient = null;
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
}

function sendToRenderer(channel, data) {
  if (global.mainWindow) {
    global.mainWindow.webContents.send(channel, data)
  }
}