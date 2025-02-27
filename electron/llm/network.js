import WebSocket from 'ws'
import axios from 'axios'
import config from '../config'
import { OllamaClient, LMStudioClient, ExoClient, VLLMClient, CustomLLMClient } from './clients'
import Store from 'electron-store'

const store = new Store()

export class NetworkClient {
    constructor() {
      this.ws = null;
      this.isConnected = false;
      this.lastPong = Date.now();
      this.heartbeatInterval = null;
      this.reconnectAttempts = 0;
      this.maxReconnectAttempts = 5;
      this.models = [];
      this.shouldReconnect = true;
      this.reconnectDelay = 5000;
      this.isReconnecting = false;
      this.registrationTimeout = null;
    }

  async getUserInfo() {
    try {
      const apiKey = store.get('apiKey');
      const response = await axios.get(`${config.API_URL}/auth/me`, {
        headers: { 
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to get user info:', error);
      return null;
    }
  }

  setupHeartbeat() {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);

    // Add keepalive ping
    this.ws.on('ping', () => {
      try {
        this.ws.pong();
        this.lastPong = Date.now();
      } catch (error) {
        console.error('Error sending pong:', error);
        this.reconnect();
      }
    });

    this.ws.on('pong', () => {
      this.lastPong = Date.now();
    });

    // More aggressive connection monitoring
    this.heartbeatInterval = setInterval(() => {
      if (Date.now() - this.lastPong > 45000) {
        console.log('Connection dead - reconnecting...');
        this.reconnect();
      }
      
      // Actively test connection
      if (this.ws.readyState === WebSocket.OPEN) {
        try {
          this.ws.ping();
        } catch (error) {
          console.error('Ping failed:', error);
          this.reconnect();
        }
      }
    }, 15000);
  }

  async connect(models) {
    if (!this.shouldReconnect) {
      console.log('Connection cancelled - shutdown in progress');
      return { success: false, error: 'Connection cancelled - shutdown in progress' };
    }

    if (this.isReconnecting) {
      console.log('Already attempting to reconnect');
      return { success: false, error: 'Already attempting to reconnect' };
    }

    // Validate models array
    if (!models || !Array.isArray(models) || models.length === 0) {
      console.error('No models provided for connection');
      return { success: false, error: 'No models provided for connection' };
    }

    const apiKey = store.get('apiKey');
    if (!apiKey) {
      return { success: false, error: 'No API key found' };
    }
    
    // Process models to ensure they have proper displayName
    // We need to keep the full model details locally for handling requests
    const processedModels = models.map(model => {
      // Create a shallow copy to avoid modifying the original
      const processedModel = { ...model };
      
      // Add displayName if not present
      if (!processedModel.displayName) {
        if (processedModel.type === 'custom' && processedModel.details?.externalModelId) {
          processedModel.displayName = processedModel.details.externalModelId;
        } else {
          processedModel.displayName = processedModel.name;
        }
      }
      
      return processedModel;
    });
    
    this.models = processedModels;

    await this.cleanup(false);

    this.ws = new WebSocket(config.WS_URL, {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.ws.terminate();
        resolve({ success: false, error: 'Connection timeout' });
      }, 15000);

      this.ws.on('open', async () => {
        clearTimeout(timeout);
        this.isConnected = true;
        this.isReconnecting = false;
        if (global.mainWindow) {
            global.mainWindow.webContents.send('llm:status', { connected: true });
        }
        this.reconnectAttempts = 0;
        this.setupHeartbeat();
        
        try {
          await this.register(this.models);
          resolve({ success: true });
        } catch (error) {
          resolve({ success: false, error: error.message || 'Registration failed' });
        }
      });

      this.ws.on('message', this.handleMessage.bind(this));
      
      this.ws.on('close', async (code) => {
        this.isConnected = false;
        clearInterval(this.heartbeatInterval);
        clearTimeout(this.registrationTimeout);
        
        if (!this.isReconnecting && global.mainWindow) {
          global.mainWindow.webContents.send('llm:status', { connected: false });
        }
    
        if (code !== 1000 && this.shouldReconnect && !this.isReconnecting) {
          await this.reconnect();
        }
      });

      this.ws.on('error', async (error) => {
        console.error('WebSocket error:', error);
        if (!this.isReconnecting) {
          await this.reconnect();
        }
        reject(error);
      });
    });
  }

  async register(models) {
    try {
      if (this.registrationTimeout) {
        clearTimeout(this.registrationTimeout);
      }

      const userInfo = await this.getUserInfo();
      if (!userInfo?.userId) throw new Error('Failed to get user info');

      const apiKey = store.get('apiKey');
      if (!apiKey) throw new Error('No API key found');

      const modelList = models.filter(m => m && m.name);
      if (!modelList.length) {
        const error = new Error('No models available for registration');
        console.error(error.message);
        throw error;
      }

      // Simplify to just an array of model IDs
      const modelIds = modelList.map(m => {
        // For custom models, use the externalModelId if available
        if (m.type === 'custom' && m.details && m.details.externalModelId) {
          return m.details.externalModelId;
        }
        // For standard models, use the name
        return m.name;
      });

      const message = {
        type: 'register',
        apiKey: apiKey,
        models: modelIds, // Just send the array of model IDs
        userId: userInfo.userId,
        provider: userInfo.provider,
        timestamp: Date.now()
      };

      // Log sanitized version without API key
      console.log('Sending registration:', {
        type: message.type,
        models: message.models,
        userId: message.userId,
        hasApiKey: !!message.apiKey,
        timestamp: message.timestamp
      });

      // Set a timeout to retry registration if we don't get a response
      this.registrationTimeout = setTimeout(() => {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          console.log('Registration timeout - retrying...');
          this.register(models);
        }
      }, 10000);

      this.ws.send(JSON.stringify(message));
      this.setupHeartbeat();
    } catch (error) {
      console.error('Failed to register:', error);
      if (this.registrationTimeout) {
        clearTimeout(this.registrationTimeout);
        this.registrationTimeout = null;
      }
      throw error;
    }
  }

  async handleMessage(data) {
    const message = JSON.parse(data);
    console.log('Received message:', message.type);

    switch (message.type) {
      case 'completion_request':
        await this.handleCompletionRequest(message);
        break;
      case 'registered':
        console.log(`Registration ${message.status}: ${message.message} (Socket: ${message.socketId})`);
        // Clear registration timeout since we got a response
        if (this.registrationTimeout) {
          clearTimeout(this.registrationTimeout);
          this.registrationTimeout = null;
        }
        // If already registered, no need to keep retrying registration
        if (message.status === 'already_registered') {
          console.log('Models already registered, skipping retry');
        }
        break;
      case 'error':
        console.error('Server error:', message.error);
        break;
    }
  }

  async handleCompletionRequest(message) {
    const llmClients = {
      ollama: new OllamaClient(),
      lmstudio: new LMStudioClient(),
      exo: new ExoClient(),
      vllm: new VLLMClient()
    };

    try {
      // Find the model by matching against name, displayName, or externalModelId for custom models
      const model = this.models.find(m => {
        // Check standard name match
        if (m.name === message.model) return true;
        
        // Check displayName match
        if (m.displayName && m.displayName === message.model) return true;
        
        // For custom models, check externalModelId
        if (m.type === 'custom' && m.details && m.details.externalModelId === message.model) return true;
        
        return false;
      });
      
      if (!model) {
        throw new Error(`Model ${message.model} not available`);
      }

      // Log activity start
      if (global.mainWindow) {
        global.mainWindow.webContents.send('llm:activity', {
          type: 'completion_start',
          message: `Processing request for ${model.displayName || model.name}`,
          timestamp: Date.now()
        });
      }

      let client;
      let modelName = model.name;

      if (model.type === 'custom') {
        // Handle custom model type
        if (!model.details) {
          throw new Error(`Custom model details not found for ${model.displayName || model.name}`);
        }
        
        client = new CustomLLMClient({
          baseUrl: model.details.baseUrl,
          apiKey: model.details.apiKey,
          modelType: model.details.modelType
        });
        
        // Use external model ID if available
        modelName = model.details.externalModelId || model.name;
      } else {
        // Handle standard model types
        client = llmClients[model.type];
        if (!client) {
          throw new Error(`Unsupported model type: ${model.type}`);
        }
      }

      const response = await client.generateCompletion(
        modelName,
        message.messages,
        {
          temperature: message.temperature,
          max_tokens: message.max_tokens,
          useAnthropicV1: model.type === 'custom' && model.details?.useAnthropicV1 || false
        }
      );

      // Log successful completion
      if (global.mainWindow) {
        global.mainWindow.webContents.send('llm:activity', {
          type: 'completion_success',
          message: `Completed request for ${model.displayName || model.name}`,
          timestamp: Date.now(),
          tokens: response.usage
        });
      }

      // Ensure we don't send any sensitive information back
      const sanitizedResponse = { ...response };
      if (sanitizedResponse.model) {
        // Replace model information with just the name or ID
        sanitizedResponse.model = model.displayName || model.name;
      }

      this.ws.send(JSON.stringify({
        type: 'completion_response',
        requestId: message.requestId,
        response: sanitizedResponse
      }));

    } catch (error) {
      // Log error
      if (global.mainWindow) {
        global.mainWindow.webContents.send('llm:activity', {
          type: 'completion_error',
          message: `Error: ${error.message || 'Unknown error'}`,
          timestamp: Date.now()
        });
      }

      // Ensure we have a proper error message
      let errorMessage = 'Unknown error occurred';
      
      if (error instanceof Error) {
        errorMessage = error.message || errorMessage;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (typeof error === 'object') {
        errorMessage = JSON.stringify(error) || errorMessage;
      }

      this.ws.send(JSON.stringify({
        type: 'completion_response',
        requestId: message.requestId,
        response: {
          error: {
            message: errorMessage,
            type: "provider_error",
            code: "completion_failed"
          }
        }
      }));
    }
  }

  async disconnect() {
    await this.cleanup(true);
  }

  async reconnect() {
    if (!this.shouldReconnect || this.isReconnecting) return;
  
    this.isReconnecting = true;
    this.reconnectAttempts++;
    console.log(`Reconnecting (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    try {
      await new Promise(r => setTimeout(r, this.reconnectDelay));
      await this.connect(this.models);
      this.reconnectAttempts = 0;
    } catch (error) {
      console.error('Reconnection failed:', error);
      this.isReconnecting = false;
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.log('Max attempts reached - stopping reconnection');
        this.shouldReconnect = false;
        if (global.mainWindow) {
          global.mainWindow.webContents.send('llm:status', { connected: false });
        }
        return;
      }
      
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000);
      await this.reconnect();
    }
  }

  async cleanup(setShouldReconnect = true) {
    console.log('Cleaning up...');
    if (setShouldReconnect) {
      this.shouldReconnect = false;
    }

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    if (this.registrationTimeout) {
      clearTimeout(this.registrationTimeout);
    }

    if (this.ws) {
      try {
        if (this.ws.readyState === WebSocket.OPEN) {
          await new Promise((resolve) => {
            this.ws.send(JSON.stringify({
              type: 'disconnect',
              message: 'Client shutting down'
            }), resolve);
          });
        }
        this.ws.removeAllListeners();
        this.ws.terminate();
        this.ws = null;
      } catch (error) {
        console.error('Cleanup error:', error);
      }
    }

    this.isConnected = false;
    this.isReconnecting = false;
    await new Promise(r => setTimeout(r, 500));
  }
}