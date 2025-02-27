import axios from 'axios'
import Store from 'electron-store'
import crypto from 'crypto'

const store = new Store()

// Simple encryption/decryption functions for API keys
function encryptApiKey(apiKey) {
  if (!apiKey) return '';
  try {
    // Use a machine-specific value as encryption key
    // This makes the encrypted value only usable on this machine
    const machineId = store.get('machineId');
    if (!machineId) {
      const newMachineId = crypto.randomBytes(32).toString('hex');
      store.set('machineId', newMachineId);
    }
    
    const encryptionKey = store.get('machineId');
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', 
      crypto.createHash('sha256').update(encryptionKey).digest(), iv);
    
    let encrypted = cipher.update(apiKey, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return `${iv.toString('hex')}:${encrypted}`;
  } catch (error) {
    console.error('Encryption error:', error);
    return '';
  }
}

function decryptApiKey(encryptedApiKey) {
  if (!encryptedApiKey) return '';
  try {
    const machineId = store.get('machineId');
    if (!machineId) return '';
    
    const [ivHex, encrypted] = encryptedApiKey.split(':');
    if (!ivHex || !encrypted) return '';
    
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', 
      crypto.createHash('sha256').update(machineId).digest(), iv);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    return '';
  }
}

export class ModelDetector {
  constructor() {
    this.config = {
      ollama: 'http://localhost:11434',
      lmstudio: 'http://localhost:1234/v1',
      exo: 'http://localhost:52415',
      vllm: 'http://localhost:8000/v1'
    }
    console.log('ModelDetector initialized with config:', this.config);
  }

  async detectAll() {
    console.log('Starting detectAll...');
    const services = await this.checkServices()
    console.log('Available services:', services);
    const models = []

    if (services.ollama) {
      console.log('Detecting Ollama models...');
      const ollamaModels = await this.detectOllamaModels()
      console.log('Found Ollama models:', ollamaModels);
      models.push(...ollamaModels)
    }

    if (services.lmstudio) {
      console.log('Detecting LM Studio models...');
      const lmstudioModels = await this.detectLMStudioModels()
      console.log('Found LM Studio models:', lmstudioModels);
      models.push(...lmstudioModels)
    }

    if (services.exo) {
      console.log('Detecting EXO models...');
      const exoModels = await this.detectExoModels()
      console.log('Found EXO models:', exoModels);
      models.push(...exoModels)
    }

    if (services.vllm) {
      console.log('Detecting vLLM models...');
      const vllmModels = await this.detectVLLMModels()
      console.log('Found vLLM models:', vllmModels);
      models.push(...vllmModels)
    }

    // Add custom models from storage
    console.log('Retrieving custom models...');
    const customModels = await this.getCustomModels();
    // Note: Custom models are already logged in getCustomModels with sanitized API keys
    models.push(...customModels);

    // Create a sanitized version for logging
    const sanitizedModels = models.map(model => {
      // Create a deep copy without sensitive data
      const sanitized = { ...model };
      if (sanitized.details && sanitized.details.apiKey) {
        sanitized.details = { ...sanitized.details, apiKey: '********' };
      }
      return sanitized;
    });
    
    console.log('Total models detected:', sanitizedModels);
    return models
  }

  async checkServices() {
    console.log('Checking services availability...');
    const services = {}
    for (const [name, url] of Object.entries(this.config)) {
      try {
        console.log(`Checking ${name} at ${url}...`);
        await axios.get(url)
        console.log(`${name} is available`);
        services[name] = true
      } catch (error) {
        console.log(`${name} is not available:`, error.message);
        services[name] = false
      }
    }
    return services
  }

  async detectOllamaModels() {
    try {
      console.log('Fetching Ollama models from:', `${this.config.ollama}/api/tags`);
      const response = await axios.get(`${this.config.ollama}/api/tags`)
      console.log('Ollama response:', response.data);
      return response.data.models.map(model => ({
        name: model.name,
        type: 'ollama',
        details: model
      }))
    } catch (error) {
      console.log('Failed to detect Ollama models:', error.message);
      return []
    }
  }

  async detectLMStudioModels() {
    try {
      console.log('Fetching LM Studio models from:', `${this.config.lmstudio}/models`);
      const response = await axios.get(`${this.config.lmstudio}/models`)
      console.log('LM Studio response:', response.data);
      return response.data.data.map(model => ({
        name: model.id,
        type: 'lmstudio'
      }))
    } catch (error) {
      console.log('Failed to detect LM Studio models:', error.message);
      return []
    }
  }

  async detectExoModels() {
    try {
      console.log('Fetching EXO models from:', `${this.config.exo}/v1/models`);
      const response = await axios.get(`${this.config.exo}/v1/models`)
      console.log('EXO response:', response.data);
      return response.data.data.map(model => ({
        name: model.id,
        type: 'exo'
      }))
    } catch (error) {
      console.log('Failed to detect EXO models:', error.message);
      return []
    }
  }

  async detectVLLMModels() {
    try {
      console.log('Fetching vLLM models from:', `${this.config.vllm}/models`);
      const response = await axios.get(`${this.config.vllm}/models`)
      console.log('vLLM response:', response.data);
      return response.data.data.map(model => ({
        name: model.id,
        type: 'vllm'
      }))
    } catch (error) {
      console.log('Failed to detect vLLM models:', error.message);
      return []
    }
  }

  async getCustomModels() {
    try {
      const customModels = store.get('customModels') || [];
      const models = customModels.map(model => ({
        name: model.modelName,
        id: model.externalModelId || model.modelName,
        type: 'custom',
        details: {
          baseUrl: model.baseUrl,
          modelType: model.modelType,
          apiKey: decryptApiKey(model.apiKey),
          useAnthropicV1: model.useAnthropicV1 || false,
          externalModelId: model.externalModelId
        }
      }));
      
      // Create a sanitized version for logging (without API keys)
      const sanitizedModels = models.map(model => ({
        ...model,
        details: {
          ...model.details,
          apiKey: model.details.apiKey ? '********' : null
        }
      }));
      
      console.log('Found custom models:', sanitizedModels);
      return models;
    } catch (error) {
      console.log('Failed to retrieve custom models:', error.message);
      return [];
    }
  }

  async addCustomModel(modelConfig) {
    try {
      // Get existing custom models
      const customModels = store.get('customModels') || [];
      
      // Encrypt the API key before storing
      const secureModelConfig = {
        ...modelConfig,
        apiKey: encryptApiKey(modelConfig.apiKey)
      };
      
      // Add new model
      customModels.push(secureModelConfig);
      
      // Save back to store
      store.set('customModels', customModels);
      
      return true;
    } catch (error) {
      console.error('Failed to add custom model:', error);
      return false;
    }
  }

  async removeCustomModel(modelName) {
    try {
      // Get existing custom models
      const customModels = store.get('customModels') || [];
      
      // Filter out the model to remove
      const updatedModels = customModels.filter(model => model.modelName !== modelName);
      
      // Save back to store
      store.set('customModels', updatedModels);
      
      return true;
    } catch (error) {
      console.error('Failed to remove custom model:', error);
      return false;
    }
  }
}