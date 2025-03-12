import { ipcMain } from 'electron'
import { ModelDetector } from './detector'
import { NetworkClient } from './network'
import { LMStudioClient, OllamaClient, ExoClient, VLLMClient, CustomLLMClient } from './clients'
import axios from 'axios';
import Store from 'electron-store';
import { app } from 'electron';

const store = new Store();
let networkClient = null;
const detector = new ModelDetector();
const lmStudioClient = new LMStudioClient();
const ollamaClient = new OllamaClient();
const exoClient = new ExoClient();
const vllmClient = new VLLMClient();

// Keep track of active requests
let activeRequests = new Map();

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

  ipcMain.handle('llm:chat', async (event, { model, messages, temperature, max_tokens, type, isLocal, requestId, stream }) => {
    const abortController = new AbortController();
    
    // Store the abort controller
    activeRequests.set(requestId, abortController);

    try {
      if (isLocal) {
        let client;
        let modelDetails = null;
        
        switch (type) {
          case 'lmstudio':
            client = lmStudioClient;
            break;
          case 'ollama':
            client = ollamaClient;
            break;
          case 'exo':
            client = exoClient;
            break;
          case 'vllm':
            client = vllmClient;
            break;
          case 'custom':
            // Get the custom model details from detector
            const customModels = await detector.getCustomModels();
            modelDetails = customModels.find(m => m.name === model)?.details;
            
            if (!modelDetails) {
              throw new Error(`Custom model details not found for ${model}`);
            }
            
            // Create a new custom client instance with the model details
            client = new CustomLLMClient({
              baseUrl: modelDetails.baseUrl,
              apiKey: modelDetails.apiKey,
              modelType: modelDetails.modelType,
            });
            
            // Use the external model ID for the API request instead of the display name
            model = modelDetails.externalModelId || model;
            break;
          default:
            throw new Error(`Unsupported local model type: ${type}`);
        }

        // Check if streaming is requested and supported by the client
        const shouldStream = stream === true && typeof client.generateCompletionStream === 'function';
        if (shouldStream) {
          // If streaming is supported, use it
          let fullContent = '';
          
          try {
            console.log(`Starting streaming with ${type} model: ${model}`);
            for await (const chunk of client.generateCompletionStream(model, messages, { 
              temperature, 
              max_tokens,
              signal: abortController.signal,
              useAnthropicV1: type === 'custom' && modelDetails?.useAnthropicV1 || false
            })) {
              // Extract content from the chunk based on response format
              let content = '';
              if (chunk.content) {
                content = chunk.content;
              } else if (chunk.choices?.[0]?.delta?.content) {
                content = chunk.choices[0].delta.content;
              } else if (chunk.choices?.[0]?.message?.content) {
                content = chunk.choices[0].message.content;
              } else if (typeof chunk === 'string') {
                content = chunk;
              }
              
              if (content) {
                fullContent += content;
                // Send the chunk to the renderer process
                event.sender.send(`llm:stream:${requestId}`, { content });
              }
            }
            
            // Clean up after successful completion
            activeRequests.delete(requestId);
            console.log(`Streaming completed for ${model}`);
            
            // Return the full content for fallback support
            return { content: fullContent };
          } catch (error) {
            console.error(`Streaming error for ${model}:`, error);
            if (error.name === 'AbortError' || error.code === 'ERR_CANCELED') {
              throw new Error('Request cancelled by user');
            }
            throw error;
          }
        } else {
          console.log(`Streaming not supported or disabled for ${type} model: ${model}`);
          // Fallback to non-streaming if not supported
          const response = await retryWithBackoff(async () => {
            const response = await client.generateCompletion(model, messages, { 
              temperature, 
              max_tokens,
              signal: abortController.signal,
              useAnthropicV1: type === 'custom' && modelDetails?.useAnthropicV1 || false
            });
            if (!response || (!response.content && !response.choices?.[0]?.message?.content)) {
              throw new Error('Invalid response from local model');
            }
            // Normalize response format
            return response.choices?.[0]?.message || response;
          });

          // Clean up after successful completion
          activeRequests.delete(requestId);
          return response;
        }
      } else {
        const apiKey = await store.get('apiKey');
        if (!apiKey) {
          throw new Error('API key not found');
        }

        // Check if streaming is requested
        const shouldStream = stream === true;
        if (shouldStream) {
          let fullContent = '';
          
          try {
            const response = await axios.post(
              `${process.env.API_URL}/v1/chat/completions`,
              {
                model,
                messages,
                temperature,
                max_tokens,
                stream: true
              },
              {
                headers: {
                  'Authorization': `Bearer ${apiKey}`,
                  'Accept': 'text/event-stream', // Required for streaming
                  'Content-Type': 'application/json'
                },
                responseType: 'stream',
                timeout: 60000, // 60 second timeout
                signal: abortController.signal
              }
            );

            // Process the stream
            for await (const chunk of response.data) {
              const lines = chunk.toString().split('\n').filter(line => line.trim() !== '');
              
              for (const line of lines) {
                if (line.includes('[DONE]')) continue;
                if (!line.startsWith('data:')) continue;
                
                try {
                  const data = JSON.parse(line.substring(5));
                  if (data.choices && data.choices[0]?.delta?.content) {
                    const content = data.choices[0].delta.content;
                    fullContent += content;
                    
                    // Send the chunk to the renderer process
                    event.sender.send(`llm:stream:${requestId}`, { content });
                  }
                } catch (e) {
                  console.error('Error parsing SSE data:', e);
                }
              }
            }
            
            // Clean up after successful completion
            activeRequests.delete(requestId);
            
            // Return the full content for fallback support
            return { content: fullContent };
          } catch (error) {
            if (error.name === 'AbortError' || error.code === 'ERR_CANCELED') {
              throw new Error('Request cancelled by user');
            }
            throw error;
          }
        } else {
          // Non-streaming fallback
          const response = await retryWithBackoff(async () => {
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
                signal: abortController.signal
              }
            );

            if (!response.data?.choices?.[0]?.message) {
              throw new Error('Invalid response format from API');
            }

            return response.data.choices[0].message;
          });

          // Clean up after successful completion
          activeRequests.delete(requestId);
          return response;
        }
      }
    } catch (error) {
      // Clean up on error
      activeRequests.delete(requestId);
      
      console.error('Chat error:', error);
      
      if (error.name === 'AbortError' || error.code === 'ERR_CANCELED') {
        throw new Error('Request cancelled by user');
      }
      
      // Handle specific error types
      if (error.code === 'ECONNREFUSED') {
        throw new Error('Could not connect to the model service. Please check if the service is running.');
      }
      
      if (error.code === 'ETIMEDOUT' || error.code === 'ESOCKETTIMEDOUT') {
        throw new Error('Request timed out. Please try again.');
      }
      
      // Improved error handling for response data errors
      if (error.response?.data?.error) {
        // If error.response.data.error is an object, extract the message
        if (typeof error.response.data.error === 'object') {
          throw new Error(error.response.data.error.message || 'Unknown API error');
        }
        throw new Error(error.response.data.error);
      }
      
      // For socket hang up specifically
      if (error.message?.includes('socket hang up')) {
        throw new Error('Connection was interrupted. Please try again.');
      }
      
      // Ensure we always throw a proper Error with a string message
      if (typeof error === 'object' && !(error instanceof Error)) {
        throw new Error(JSON.stringify(error) || 'Unknown error occurred');
      }
      
      // If it's already an Error instance but without a message
      if (error instanceof Error && !error.message) {
        throw new Error('Unknown error occurred during chat completion');
      }
      
      throw error;
    }
  });

  ipcMain.handle('llm:cancel', async (_, requestId) => {
    const controller = activeRequests.get(requestId);
    if (controller) {
      controller.abort();
      activeRequests.delete(requestId);
      return { success: true };
    }
    return { success: false, error: 'Request not found' };
  });

  ipcMain.handle('llm:connect', async (_, models) => {
    try {
      // Clean up existing client if it exists
      if (networkClient) {
        await networkClient.cleanup(true);
        networkClient = null;
      }
      
      networkClient = new NetworkClient();
      if (!models || !models.length) {
        throw new Error('No models provided for connection');
      }
      await networkClient.connect(models);
      return { success: true };
    } catch (error) {
      console.error('Connection failed:', error);
      // Clean up on error
      if (networkClient) {
        await networkClient.cleanup(true);
        networkClient = null;
      }
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
      console.error('Disconnect error:', error);
      // Force cleanup even if disconnect fails
      if (networkClient) {
        try {
          await networkClient.cleanup(true);
        } catch (cleanupError) {
          console.error('Forced cleanup error:', cleanupError);
        }
        networkClient = null;
      }
      return { success: false, error: error.message };
    }
  });

  // Add app quit handler to ensure cleanup
  app.on('before-quit', async () => {
    if (networkClient) {
      try {
        await networkClient.cleanup(true);
        networkClient = null;
      } catch (error) {
        console.error('Quit cleanup error:', error);
      }
    }
  });

  // Add handlers for custom models
  ipcMain.handle('llm:addCustomModel', async (event, modelConfig) => {
    return await detector.addCustomModel(modelConfig);
  });

  ipcMain.handle('llm:removeCustomModel', async (event, modelName) => {
    return await detector.removeCustomModel(modelName);
  });
}

function sendToRenderer(channel, data) {
  if (global.mainWindow) {
    global.mainWindow.webContents.send(channel, data)
  }
}