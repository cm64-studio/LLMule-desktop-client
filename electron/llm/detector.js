import axios from 'axios'
import Store from 'electron-store'

const store = new Store()

export class ModelDetector {
  constructor() {
    this.config = {
      ollama: 'http://localhost:11434',
      lmstudio: 'http://localhost:1234/v1',
      exo: 'http://localhost:52415'
    }
  }

  async detectAll() {
    const services = await this.checkServices()
    const models = []

    if (services.ollama) {
      const ollamaModels = await this.detectOllamaModels()
      models.push(...ollamaModels)
    }

    if (services.lmstudio) {
      const lmstudioModels = await this.detectLMStudioModels()
      models.push(...lmstudioModels)
    }

    return models
  }

  async checkServices() {
    const services = {}
    for (const [name, url] of Object.entries(this.config)) {
      try {
        await axios.get(url)
        services[name] = true
      } catch {
        services[name] = false
      }
    }
    return services
  }

  async detectOllamaModels() {
    try {
      const response = await axios.get(`${this.config.ollama}/api/tags`)
      return response.data.models.map(model => ({
        name: model.name,
        type: 'ollama',
        details: model
      }))
    } catch {
      return []
    }
  }

  async detectLMStudioModels() {
    try {
      const response = await axios.get(`${this.config.lmstudio}/models`)
      return response.data.data.map(model => ({
        name: model.id,
        type: 'lmstudio'
      }))
    } catch {
      return []
    }
  }
}