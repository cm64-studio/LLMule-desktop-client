import WebSocket from 'ws'
import axios from 'axios'
import config from '../config'
import { OllamaClient, LMStudioClient, ExoClient, VLLMClient } from './clients'
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
      return;
    }

    const apiKey = store.get('apiKey');
    if (!apiKey) throw new Error('No API key found');
    
    this.models = models;
    this.ws = new WebSocket(config.WS_URL, {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.ws.terminate();
        reject(new Error('Connection timeout'));
      }, 15000);

      this.ws.on('open', async () => {
        clearTimeout(timeout);
        this.isConnected = true;
        // Notify UI
        if (global.mainWindow) {
            global.mainWindow.webContents.send('llm:status', { connected: true });
        }
        this.reconnectAttempts = 0;
        this.setupHeartbeat();
        
        try {
          await this.register(models);
          resolve();
        } catch (error) {
          reject(error);
        }
      });

      this.ws.on('message', this.handleMessage.bind(this));
      
      this.ws.on('close', async (code) => {
        this.isConnected = false;
        clearInterval(this.heartbeatInterval);
        
        // Notify UI
        if (global.mainWindow) {
          global.mainWindow.webContents.send('llm:status', { connected: false });
        }
    
        if (code !== 1000 && this.shouldReconnect) {
          await this.reconnect();
        }
      });

      this.ws.on('error', async (error) => {
        console.error('WebSocket error:', error);
        await this.reconnect();
        reject(error);
      });
    });
  }

  async register(models) {
    try {
      const userInfo = await this.getUserInfo();
      if (!userInfo?.userId) throw new Error('Failed to get user info');

      const modelList = models || this.models || [];
      const apiKey = store.get('apiKey');

      if (!modelList.length) {
        console.error('No models available for registration');
        return;
      }

      const message = {
        type: 'register',
        apiKey: apiKey,
        models: modelList.map(m => m.name),
        userId: userInfo.userId,
        provider: userInfo.provider
      };

      console.log('Sending registration:', JSON.stringify({
        type: message.type,
        models: message.models,
        userId: message.userId,
        hasApiKey: !!message.apiKey
      }));

      this.ws.send(JSON.stringify(message));
    } catch (error) {
      console.error('Failed to register:', error);
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
        console.log('Successfully registered');
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
      const model = this.models.find(m => m.name === message.model);
      if (!model) {
        throw new Error(`Model ${message.model} not available`);
      }

      // Log activity start
      if (global.mainWindow) {
        global.mainWindow.webContents.send('llm:activity', {
          type: 'completion_start',
          message: `Processing request for ${model.name}`,
          timestamp: Date.now()
        });
      }

      const client = llmClients[model.type];
      const response = await client.generateCompletion(
        model.name,
        message.messages,
        {
          temperature: message.temperature,
          max_tokens: message.max_tokens
        }
      );

      // Log successful completion
      if (global.mainWindow) {
        global.mainWindow.webContents.send('llm:activity', {
          type: 'completion_success',
          message: `Completed request for ${model.name}`,
          timestamp: Date.now(),
          tokens: response.usage
        });
      }

      this.ws.send(JSON.stringify({
        type: 'completion_response',
        requestId: message.requestId,
        response
      }));

    } catch (error) {
      // Log error
      if (global.mainWindow) {
        global.mainWindow.webContents.send('llm:activity', {
          type: 'completion_error',
          message: `Error: ${error.message}`,
          timestamp: Date.now()
        });
      }

      this.ws.send(JSON.stringify({
        type: 'completion_response',
        requestId: message.requestId,
        response: {
          error: {
            message: error.message,
            type: "provider_error",
            code: "completion_failed"
          }
        }
      }));
    }
  }

  async disconnect() {
    await this.cleanup();
  }

  async reconnect() {
    if (!this.shouldReconnect) return;
  
    this.reconnectAttempts++;
    console.log(`Reconnecting (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    try {
      await new Promise(r => setTimeout(r, this.reconnectDelay));
      await this.connect(this.models);
      this.reconnectAttempts = 0;
    } catch (error) {
      console.error('Reconnection failed:', error);
      
      // Reset and try again if max attempts reached
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.log('Max attempts reached - resetting counter and continuing...');
        this.reconnectAttempts = 0;
        await new Promise(r => setTimeout(r, 10000)); // Longer delay before reset
        this.reconnect();
      }
    }
  }


  async cleanup() {
    console.log('Cleaning up...');
    this.shouldReconnect = false;

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
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
        this.ws.terminate();
      } catch (error) {
        console.error('Cleanup error:', error);
      }
    }

    this.isConnected = false;
    await new Promise(r => setTimeout(r, 500));
  }
  
}