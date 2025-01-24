// electron/services/llama.js
import { app } from 'electron';
import path from 'path';
import fs from 'fs/promises';
import { execFile } from 'child_process';
import axios from 'axios';
import { pipeline } from 'stream';
import { promisify } from 'util';
import { createWriteStream } from 'fs';
import { FEATURED_MODELS } from './models.js';

axios.interceptors.response.use(
    response => response,
    error => {
      console.error('Axios error:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        url: error.config?.url,
        message: error.message
      });
      throw error;
    }
  );

const streamPipeline = promisify(pipeline);

class LlamaService {
  constructor() {
    this.basePath = path.join(app.getPath('userData'), 'llama');
    this.modelsPath = path.join(this.basePath, 'models');
    this.binPath = path.join(this.basePath, 'bin');
  }

  async initialize() {
    await fs.mkdir(this.basePath, { recursive: true });
    await fs.mkdir(this.modelsPath, { recursive: true });
    await fs.mkdir(this.binPath, { recursive: true });
  }

  async ensureLlamaCpp() {
    const platform = process.platform;
    const arch = process.arch;
    
    // Define platform-specific binary name and URL
    const binaries = {
      darwin: {
        arm64: {
          name: 'llama-mac-arm64',
          url: 'BINARY_URL_FOR_MAC_ARM64'
        },
        x64: {
          name: 'llama-mac-x64',
          url: 'BINARY_URL_FOR_MAC_X64'
        }
      },
      win32: {
        x64: {
          name: 'llama.exe',
          url: 'BINARY_URL_FOR_WIN'
        }
      },
      linux: {
        x64: {
          name: 'llama',
          url: 'BINARY_URL_FOR_LINUX'
        }
      }
    };

    const binary = binaries[platform]?.[arch];
    if (!binary) {
      throw new Error('Unsupported platform or architecture');
    }

    const binaryPath = path.join(this.binPath, binary.name);
    
    // Check if binary exists
    try {
      await fs.access(binaryPath);
      return binaryPath;
    } catch {
      // Download binary
      const response = await axios({
        url: binary.url,
        method: 'GET',
        responseType: 'stream'
      });

      await streamPipeline(response.data, createWriteStream(binaryPath));
      await fs.chmod(binaryPath, 0o755); // Make executable
      
      return binaryPath;
    }
  }

  // electron/services/llama.js
async downloadModel(modelId, options = {}) {
    const { onProgress, onStatusChange } = options;
    
    try {
      console.log('Starting download for model:', modelId);
      
      // Get model info
      const modelInfo = FEATURED_MODELS.find(m => m.id === modelId);
      if (!modelInfo) {
        console.error('Model info not found:', modelId);
        throw new Error('Invalid model ID');
      }
  
      console.log('Model info:', modelInfo);
      const modelPath = path.join(this.modelsPath, `${modelId}.gguf`);
      console.log('Model will be saved to:', modelPath);
      
      try {
        // Check if model already exists
        await fs.access(modelPath);
        console.log('Model already exists at:', modelPath);
        onStatusChange?.('ready');
        return modelPath;
      } catch (error) {
        console.log('Model not found locally, starting download...');
        // Download model
        onStatusChange?.('downloading');
        
        const response = await axios({
          url: modelInfo.downloadUrl,
          method: 'GET',
          responseType: 'stream',
          onDownloadProgress: (progressEvent) => {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            console.log(`Download progress: ${progress}%`);
            onProgress?.(progress);
          }
        });
  
        console.log('Creating write stream to:', modelPath);
        await streamPipeline(response.data, createWriteStream(modelPath));
        
        onStatusChange?.('setting-up');
        console.log('Download complete, setting up...');
        
        onStatusChange?.('ready');
        console.log('Model ready at:', modelPath);
        return modelPath;
      }
    } catch (error) {
      console.error('Download error:', error);
      throw error;
    }
  }

  async getDownloadedModels() {
    try {
      const files = await fs.readdir(this.modelsPath);
      const modelFiles = files.filter(f => f.endsWith('.gguf'));
      return modelFiles.map(f => path.join(this.modelsPath, f));
    } catch (error) {
      console.error('Failed to get downloaded models:', error);
      return [];
    }
  }

  async startInference(modelId, options = {}) {
    const modelPath = path.join(this.modelsPath, `${modelId}.gguf`);
    const binaryPath = await this.ensureLlamaCpp();
    
    // Start llama.cpp server
    const server = execFile(binaryPath, [
      '--model', modelPath,
      '--ctx-size', '2048',
      '--threads', '4',
      '--port', '8080',
      '--host', '127.0.0.1'
    ]);

    // Handle server events
    server.stdout.on('data', (data) => {
      console.log('llama.cpp:', data.toString());
    });

    server.stderr.on('data', (data) => {
      console.error('llama.cpp error:', data.toString());
    });

    return {
      stop: () => {
        server.kill();
      }
    };
  }

  async stopInference(modelId) {
    const modelPath = path.join(this.modelsPath, `${modelId}.gguf`);
    const binaryPath = await this.ensureLlamaCpp();

    // Stop llama.cpp server
    const server = execFile(binaryPath, [
      '--stop',
      '--port', '8080'
    ]);

    return {
      stop: () => {
        server.kill();
      }
    };
  }
}

export const llamaService = new LlamaService();
