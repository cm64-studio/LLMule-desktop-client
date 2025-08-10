'use strict';

const { exec } = require('child_process');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { app } = require('electron');
const { promisify } = require('util');
const execAsync = promisify(exec);
const https = require('https');
const { pipeline } = require('stream');
const { createWriteStream } = require('fs');
const { promisify: utilPromisify } = require('util');
const pipelineAsync = utilPromisify(pipeline);

// Ollama API base URL
const OLLAMA_BASE_URL = 'http://localhost:11434';

// Platform-specific Ollama download URLs
const OLLAMA_DOWNLOAD_URLS = {
  darwin: {
    arm64: 'https://ollama.com/download/Ollama-darwin.dmg',
    x64: 'https://ollama.com/download/Ollama-darwin.dmg'
  },
  win32: {
    x64: 'https://ollama.com/download/OllamaSetup.exe'
  },
  linux: {
    x64: 'https://ollama.com/install.sh'
  }
};

// Check if Ollama is installed by trying to run the command
async function isInstalled() {
  try {
    // Try to run ollama version command
    const { stdout } = await execAsync('ollama --version');
    console.log('Ollama is installed:', stdout.trim());
    return true;
  } catch (error) {
    // Command failed, Ollama is not installed or not in PATH
    console.log('Ollama is not installed or not in PATH');
    return false;
  }
}

// Check if Ollama service is running by checking the API endpoint
async function isRunning() {
  try {
    const response = await axios.get(`${OLLAMA_BASE_URL}/api/tags`, {
      timeout: 2000
    });
    console.log('Ollama service is running');
    return true;
  } catch (error) {
    console.log('Ollama service is not running');
    return false;
  }
}

// Download and install Ollama
async function install(platform, arch, progressCallback) {
  console.log('Installing Ollama for', platform, arch);
  
  const downloadUrl = OLLAMA_DOWNLOAD_URLS[platform]?.[arch];
  if (!downloadUrl) {
    throw new Error(`Unsupported platform: ${platform} ${arch}`);
  }

  try {
    if (platform === 'darwin') {
      // macOS installation
      const dmgPath = path.join(os.tmpdir(), 'Ollama.dmg');
      
      // Download DMG with progress
      await downloadFile(downloadUrl, dmgPath, progressCallback);
      
      // Mount DMG and copy app
      console.log('Mounting DMG...');
      await execAsync(`hdiutil attach "${dmgPath}" -nobrowse -noautoopen`);
      
      // Copy Ollama.app to Applications
      console.log('Copying Ollama to Applications...');
      await execAsync('cp -R /Volumes/Ollama/Ollama.app /Applications/');
      
      // Unmount DMG
      console.log('Unmounting DMG...');
      await execAsync('hdiutil detach /Volumes/Ollama');
      
      // Clean up
      fs.unlinkSync(dmgPath);
      
      // Set up ollama CLI symlink
      try {
        await execAsync('ln -sf /Applications/Ollama.app/Contents/MacOS/ollama /usr/local/bin/ollama');
      } catch (e) {
        console.log('Could not create symlink (may need sudo):', e.message);
      }
      
      return true;
    } else if (platform === 'win32') {
      // Windows installation
      const installerPath = path.join(os.tmpdir(), 'OllamaSetup.exe');
      
      // Download installer with progress
      await downloadFile(downloadUrl, installerPath, progressCallback);
      
      // Run installer silently
      console.log('Running installer...');
      await execAsync(`"${installerPath}" /S`);
      
      // Clean up
      fs.unlinkSync(installerPath);
      
      return true;
    } else if (platform === 'linux') {
      // Linux installation using install script
      const scriptPath = path.join(os.tmpdir(), 'install-ollama.sh');
      
      // Download install script
      await downloadFile(downloadUrl, scriptPath, progressCallback);
      
      // Make script executable and run it
      console.log('Running install script...');
      await execAsync(`chmod +x "${scriptPath}"`);
      await execAsync(`"${scriptPath}"`);
      
      // Clean up
      fs.unlinkSync(scriptPath);
      
      return true;
    }
  } catch (error) {
    console.error('Installation failed:', error);
    throw error;
  }
}

// Helper function to download a file with progress
async function downloadFile(url, destPath, progressCallback) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        // Handle redirect
        downloadFile(response.headers.location, destPath, progressCallback)
          .then(resolve)
          .catch(reject);
        return;
      }

      const totalSize = parseInt(response.headers['content-length'], 10);
      let downloadedSize = 0;

      const fileStream = createWriteStream(destPath);
      
      response.on('data', (chunk) => {
        downloadedSize += chunk.length;
        if (progressCallback && totalSize) {
          const progress = Math.round((downloadedSize / totalSize) * 100);
          progressCallback(progress);
        }
      });

      response.pipe(fileStream);

      fileStream.on('finish', () => {
        fileStream.close();
        resolve();
      });

      fileStream.on('error', (err) => {
        fs.unlink(destPath, () => {}); // Delete incomplete file
        reject(err);
      });
    }).on('error', reject);
  });
}

// Start Ollama service
async function start() {
  try {
    if (await isRunning()) {
      console.log('Ollama service is already running');
      return true;
    }

    console.log('Starting Ollama service...');
    
    // Start Ollama in the background
    if (process.platform === 'darwin') {
      // On macOS, use launchctl or just run the app
      exec('open -a Ollama', (error) => {
        if (error) {
          console.error('Failed to start Ollama:', error);
        }
      });
    } else if (process.platform === 'win32') {
      // On Windows, start Ollama service
      exec('ollama serve', { windowsHide: true }, (error) => {
        if (error) {
          console.error('Failed to start Ollama:', error);
        }
      });
    } else {
      // On Linux, use systemctl if available, otherwise run directly
      exec('systemctl --user start ollama || ollama serve', (error) => {
        if (error) {
          console.error('Failed to start Ollama:', error);
        }
      });
    }

    // Wait for service to be ready
    for (let i = 0; i < 30; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      if (await isRunning()) {
        console.log('Ollama service started successfully');
        return true;
      }
    }
    
    throw new Error('Ollama service failed to start within 30 seconds');
  } catch (error) {
    console.error('Failed to start Ollama:', error);
    throw error;
  }
}

// Stop Ollama service
async function stop() {
  try {
    console.log('Stopping Ollama service...');
    
    if (process.platform === 'darwin') {
      await execAsync('pkill -f "Ollama"');
    } else if (process.platform === 'win32') {
      await execAsync('taskkill /F /IM ollama.exe');
    } else {
      await execAsync('systemctl --user stop ollama || pkill ollama');
    }
    
    console.log('Ollama service stopped');
    return true;
  } catch (error) {
    console.error('Failed to stop Ollama:', error);
    // Don't throw - service might not be running
    return false;
  }
}

// List available models
async function listModels() {
  try {
    const response = await axios.get(`${OLLAMA_BASE_URL}/api/tags`);
    
    if (!response.data || !response.data.models) {
      return [];
    }
    
    // Transform Ollama's response to our format
    return response.data.models.map(model => ({
      name: model.name,
      size: model.size,
      digest: model.digest,
      modified_at: model.modified_at,
      details: model.details
    }));
  } catch (error) {
    console.error('Failed to list models:', error);
    return [];
  }
}

// Pull a model with progress tracking
async function pullModel(modelName, progressCallback) {
  try {
    console.log('Pulling model:', modelName);
    
    const response = await axios.post(
      `${OLLAMA_BASE_URL}/api/pull`,
      { name: modelName },
      {
        responseType: 'stream',
        timeout: 0 // No timeout for large downloads
      }
    );

    return new Promise((resolve, reject) => {
      let lastProgress = 0;
      
      response.data.on('data', (chunk) => {
        try {
          const lines = chunk.toString().split('\n').filter(line => line.trim());
          
          for (const line of lines) {
            const data = JSON.parse(line);
            
            if (data.status === 'downloading' && data.completed && data.total) {
              const progress = Math.round((data.completed / data.total) * 100);
              if (progress !== lastProgress) {
                lastProgress = progress;
                if (progressCallback) {
                  progressCallback(progress);
                }
              }
            } else if (data.status === 'success') {
              console.log('Model pulled successfully:', modelName);
              resolve(true);
            } else if (data.error) {
              console.error('Error pulling model:', data.error);
              reject(new Error(data.error));
            }
          }
        } catch (e) {
          // Ignore JSON parse errors for incomplete chunks
        }
      });

      response.data.on('end', () => {
        resolve(true);
      });

      response.data.on('error', (error) => {
        console.error('Stream error:', error);
        reject(error);
      });
    });
  } catch (error) {
    console.error('Failed to pull model:', error);
    throw error;
  }
}

// Remove a model
async function removeModel(modelName) {
  try {
    console.log('Removing model:', modelName);
    
    await axios.delete(`${OLLAMA_BASE_URL}/api/delete`, {
      data: { name: modelName }
    });
    
    console.log('Model removed successfully:', modelName);
    return true;
  } catch (error) {
    console.error('Failed to remove model:', error);
    throw error;
  }
}

// Generate completions for chat messages
async function generateCompletion(model, messages, options = {}) {
  try {
    console.log('Generating completion with Ollama:', model);
    
    // Convert messages to Ollama format
    const prompt = messages.map(msg => {
      if (msg.role === 'system') {
        return `System: ${msg.content}`;
      } else if (msg.role === 'user') {
        return `User: ${msg.content}`;
      } else if (msg.role === 'assistant') {
        return `Assistant: ${msg.content}`;
      }
      return msg.content;
    }).join('\n\n') + '\n\nAssistant:';

    const response = await axios.post(
      `${OLLAMA_BASE_URL}/api/generate`,
      {
        model: model,
        prompt: prompt,
        stream: false,
        options: {
          temperature: options.temperature || 0.7,
          num_predict: options.max_tokens || 4096
        }
      },
      {
        timeout: 60000 // 60 second timeout
      }
    );

    return {
      choices: [{
        message: {
          role: 'assistant',
          content: response.data.response
        },
        finish_reason: 'stop'
      }],
      usage: {
        prompt_tokens: response.data.prompt_eval_count || 0,
        completion_tokens: response.data.eval_count || 0,
        total_tokens: (response.data.prompt_eval_count || 0) + (response.data.eval_count || 0)
      },
      model: model
    };
  } catch (error) {
    console.error('Failed to generate completion:', error);
    throw error;
  }
}

// Generate streaming completions
async function generateCompletionStream(model, messages, options = {}) {
  try {
    console.log('Generating streaming completion with Ollama:', model);
    
    // Convert messages to Ollama format
    const prompt = messages.map(msg => {
      if (msg.role === 'system') {
        return `System: ${msg.content}`;
      } else if (msg.role === 'user') {
        return `User: ${msg.content}`;
      } else if (msg.role === 'assistant') {
        return `Assistant: ${msg.content}`;
      }
      return msg.content;
    }).join('\n\n') + '\n\nAssistant:';

    const response = await axios.post(
      `${OLLAMA_BASE_URL}/api/generate`,
      {
        model: model,
        prompt: prompt,
        stream: true,
        options: {
          temperature: options.temperature || 0.7,
          num_predict: options.max_tokens || 4096
        }
      },
      {
        responseType: 'stream',
        timeout: 0
      }
    );

    return response.data;
  } catch (error) {
    console.error('Failed to generate streaming completion:', error);
    throw error;
  }
}

// Export functions using CommonJS module syntax
module.exports = {
  isInstalled,
  isRunning,
  install,
  start,
  stop,
  listModels,
  pullModel,
  removeModel,  
  generateCompletion,
  generateCompletionStream,
  OLLAMA_BASE_URL
};