import { ipcMain } from 'electron'
import { ModelDetector } from './detector'
import { NetworkClient } from './network'
import { LMStudioClient } from './clients'
import axios from 'axios';
import Store from 'electron-store';

const store = new Store();
let networkClient = null;
const detector = new ModelDetector();
const lmStudioClient = new LMStudioClient();

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const retryWithBackoff = async (fn, retries = MAX_RETRIES, delay = RETRY_DELAY) => {
  try {
    return await fn();
  } catch (error) {
    if (retries === 0) throw error;
    
    // Don't retry on certain errors
    if (error.response?.status === 401 || // Unauthorized
        error.response?.status === 403 || // Forbidden
        error.response?.status === 422) { // Validation error
      throw error;
    }
    
    await sleep(delay);
    return retryWithBackoff(fn, retries - 1, delay * 2);
  }
};

export function setupLLMHandlers() {
  ipcMain.handle('llm:detect', async () => {
    return await detector.detectAll();
  });

  ipcMain.handle('llm:chat', async (_, { model, messages, temperature, max_tokens, type, isLocal }) => {
    try {
      if (isLocal) {
        if (type === 'lmstudio') {
          return await retryWithBackoff(async () => {
            const response = await lmStudioClient.chat({ model, messages, temperature, max_tokens });
            if (!response || !response.content) {
              throw new Error('Invalid response from local model');
            }
            return response;
          });
        } else {
          throw new Error('Unsupported local model type');
        }
      } else {
        const apiKey = await store.get('apiKey');
        if (!apiKey) {
          throw new Error('API key not found');
        }

        return await retryWithBackoff(async () => {
          const response = await axios.post(
            `${process.env.API_URL}/v1/chat/completions`,
            {
              model,
              messages,
              temperature,
              max_tokens,
            },
            {
              headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Accept': 'application/json'
              },
              timeout: 60000, // 60 second timeout
            }
          );

          if (!response.data?.choices?.[0]?.message) {
            throw new Error('Invalid response format from API');
          }

          return response.data.choices[0].message;
        });
      }
    } catch (error) {
      console.error('Chat error:', error);
      
      // Handle specific error types
      if (error.code === 'ECONNREFUSED') {
        throw new Error('Could not connect to the model service. Please check if the service is running.');
      }
      
      if (error.code === 'ETIMEDOUT' || error.code === 'ESOCKETTIMEDOUT') {
        throw new Error('Request timed out. Please try again.');
      }
      
      if (error.response?.data?.error) {
        throw error.response.data.error;
      }
      
      // For socket hang up specifically
      if (error.message.includes('socket hang up')) {
        throw new Error('Connection was interrupted. Please try again.');
      }
      
      throw error;
    }
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