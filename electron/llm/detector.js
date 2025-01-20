import axios from 'axios'
import Store from 'electron-store'

const store = new Store()

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

    console.log('Total models detected:', models);
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
}