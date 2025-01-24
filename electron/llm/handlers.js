import { ipcMain } from 'electron'
import { ModelDetector } from './detector'
import { NetworkClient } from './network'
import { llamaService } from '../services/llama';

let networkClient = null;
const detector = new ModelDetector();

export function setupLLMHandlers() {
  ipcMain.handle('llm:detect', async () => {
    return await detector.detectAll();
  });

  ipcMain.handle('llm:downloadModel', async (_, modelId, options) => {
    console.log('Download request received for model:', modelId);
    try {
      const model = await llamaService.downloadModel(modelId, {
        onProgress: (progress) => {
          console.log('Download progress:', progress);
          sendToRenderer('llm:download-progress', { modelId, progress });
        },
        onStatusChange: (status) => {
          console.log('Download status:', status);
          sendToRenderer('llm:download-status', { modelId, status });
        }
      });
      console.log('Download completed successfully');
      return { success: true, model };
    } catch (error) {
      console.error('Download failed:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('llm:startInference', async (_, modelId) => {
    return await llamaService.startInference(modelId);
  });

  ipcMain.handle('llm:stopInference', async (_, modelId) => {
    return await llamaService.stopInference(modelId);
  });

  ipcMain.handle('llm:getDownloadedModels', async () => {
    return await llamaService.getDownloadedModels();
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