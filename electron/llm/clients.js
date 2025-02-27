import axios from 'axios';

class LLMClient {
  async generateCompletion(model, messages, options = {}) {
    throw new Error('Method not implemented');
  }
}

export class OllamaClient extends LLMClient {
  constructor() {
    super();
    this.baseUrl = 'http://localhost:11434';
  }

  async generateCompletion(model, messages, options = {}) {
    try {
      const response = await axios.post('http://localhost:11434/api/chat', {
        model,
        messages,
        stream: false,
        options: {
          temperature: options.temperature || 0.7,
          num_predict: options.max_tokens || 4096,
        }
      }, {
        signal: options.signal
      });

      const usage = {
        prompt_tokens: this._estimateTokenCount(messages),
        completion_tokens: this._estimateTokenCount([response.data.message]),
        total_tokens: 0
      };
      usage.total_tokens = usage.prompt_tokens + usage.completion_tokens;

      return {
        choices: [{
          message: {
            role: 'assistant',
            content: response.data.message.content
          },
          finish_reason: 'stop'
        }],
        usage
      };
    } catch (error) {
      if (error.name === 'AbortError' || error.code === 'ERR_CANCELED') {
        throw new Error('Request cancelled by user');
      }
      throw new Error(`Ollama error: ${error.message}`);
    }
  }

  _estimateTokenCount(messages) {
    let totalChars = 0;
    messages.forEach(msg => {
      if (typeof msg === 'string') totalChars += msg.length;
      else if (msg.content) totalChars += msg.content.length;
    });
    return Math.ceil(totalChars / 4);
  }
}

export class LMStudioClient extends LLMClient {
  constructor() {
    super();
    this.baseUrl = 'http://localhost:1234/v1';
  }

  async generateCompletion(model, messages, options = {}) {
    try {
      const response = await axios.post(`${this.baseUrl}/chat/completions`, {
        model,
        messages,
        temperature: options.temperature || 0.7,
        max_tokens: options.max_tokens || 4096,
        stream: false
      }, {
        signal: options.signal
      });

      return {
        choices: response.data.choices,
        usage: response.data.usage || {
          prompt_tokens: 0,
          completion_tokens: 0,
          total_tokens: 0
        }
      };
    } catch (error) {
      if (error.name === 'AbortError' || error.code === 'ERR_CANCELED') {
        throw new Error('Request cancelled by user');
      }
      console.error('LMStudio chat error:', error);
      throw new Error(error.response?.data?.error?.message || error.message || 'Failed to get response from LM Studio');
    }
  }
}

export class ExoClient extends LLMClient {
  constructor() {
    super();
    this.baseUrl = 'http://localhost:52415';
  }

  async generateCompletion(model, messages, options = {}) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/v1/chat/completions`,
        {
          model,
          messages,
          temperature: options.temperature || 0.7,
          max_tokens: options.max_tokens || 4096,
          stream: false
        },
        {
          signal: options.signal
        }
      );

      return {
        choices: response.data.choices,
        usage: response.data.usage || {
          prompt_tokens: 0,
          completion_tokens: 0,
          total_tokens: 0
        }
      };
    } catch (error) {
      if (error.name === 'AbortError' || error.code === 'ERR_CANCELED') {
        throw new Error('Request cancelled by user');
      }
      throw new Error(`EXO error: ${error.message}`);
    }
  }
}

export class VLLMClient extends LLMClient {
  constructor() {
    super();
    this.baseUrl = 'http://localhost:8000/v1';
  }

  async generateCompletion(model, messages, options = {}) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model,
          messages,
          temperature: options.temperature || 0.7,
          max_tokens: options.max_tokens || 4096,
          stream: false
        },
        {
          signal: options.signal
        }
      );

      return {
        choices: response.data.choices,
        usage: response.data.usage || {
          prompt_tokens: 0,
          completion_tokens: 0,
          total_tokens: 0
        }
      };
    } catch (error) {
      if (error.name === 'AbortError' || error.code === 'ERR_CANCELED') {
        throw new Error('Request cancelled by user');
      }
      throw new Error(`vLLM error: ${error.message}`);
    }
  }
}

export class CustomLLMClient extends LLMClient {
  constructor(config) {
    super();
    this.baseUrl = config.baseUrl;
    this.apiKey = config.apiKey;
    this.modelType = config.modelType || 'custom';
    this.headers = config.headers || {};
  }

  async generateCompletion(model, messages, options = {}) {
    try {
      const headers = {
        'Content-Type': 'application/json',
        ...this.headers
      };
      
      // Add authorization if API key exists
      if (this.apiKey) {
        // Different auth header formats based on provider type
        if (this.modelType === 'anthropic') {
          headers['x-api-key'] = this.apiKey;
          headers['anthropic-version'] = 'bedrock-2023-05-31';
        } else {
          // Default Bearer token auth for OpenAI and most others
          headers['Authorization'] = `Bearer ${this.apiKey}`;
        }
      }

      const endpoint = `${this.baseUrl}/chat/completions`;
      const payload = {
        model: model,
        messages,
        temperature: options.temperature || 0.7,
        max_tokens: options.max_tokens || 4096,
        stream: false
      };

      // Add any model-specific adjustments
      if (this.modelType === 'openai' || this.modelType === 'azure') {
        // OpenAI compatible
        // (No changes needed as this is the standard format)
      } else if (this.modelType === 'anthropic') {
        // Anthropic Claude format
        // Convert messages if using older Anthropic API
        if (options.useAnthropicV1) {
          const systemMessage = messages.find(m => m.role === 'system');
          const userMessages = messages.filter(m => m.role === 'user');
          const assistantMessages = messages.filter(m => m.role === 'assistant');
          
          // Combine all messages into a single prompt with proper format
          let prompt = '';
          if (systemMessage) {
            prompt += `${systemMessage.content}\n\n`;
          }
          
          // Alternate between user and assistant
          const maxLen = Math.max(userMessages.length, assistantMessages.length);
          for (let i = 0; i < maxLen; i++) {
            if (i < userMessages.length) {
              prompt += `Human: ${userMessages[i].content}\n\n`;
            }
            if (i < assistantMessages.length) {
              prompt += `Assistant: ${assistantMessages[i].content}\n\n`;
            }
          }
          
          // Add the final "Assistant: " prompt
          prompt += 'Assistant: ';
          
          // Replace the payload for anthropic
          delete payload.messages;
          payload.prompt = prompt;
        }
      }

      console.log(`Sending request to ${endpoint} with model ${model}`);
      const response = await axios.post(endpoint, payload, {
        headers,
        signal: options.signal
      });

      // Normalize response based on provider type
      let choices, usage;
      
      if (this.modelType === 'anthropic' && options.useAnthropicV1) {
        choices = [{
          message: {
            role: 'assistant',
            content: response.data.completion
          },
          finish_reason: response.data.stop_reason || 'stop'
        }];
        
        usage = {
          prompt_tokens: this._estimateTokenCount(messages),
          completion_tokens: this._estimateTokenCount([{content: response.data.completion}]),
          total_tokens: 0
        };
        usage.total_tokens = usage.prompt_tokens + usage.completion_tokens;
      } else {
        // Standard OpenAI-compatible response format
        choices = response.data.choices;
        usage = response.data.usage || {
          prompt_tokens: this._estimateTokenCount(messages),
          completion_tokens: this._estimateTokenCount([choices[0].message]),
          total_tokens: 0
        };
        
        if (!usage.total_tokens) {
          usage.total_tokens = usage.prompt_tokens + usage.completion_tokens;
        }
      }

      return {
        choices,
        usage
      };
    } catch (error) {
      if (error.name === 'AbortError' || error.code === 'ERR_CANCELED') {
        throw new Error('Request cancelled by user');
      }
      
      // Handle common API errors with more specific messages
      if (error.response) {
        const status = error.response.status;
        
        if (status === 401) {
          throw new Error('Authentication failed: Invalid API key or unauthorized access');
        } else if (status === 403) {
          throw new Error('Access forbidden: You do not have permission to use this model');
        } else if (status === 404) {
          throw new Error(`Model not found: The model "${model}" was not found on this API endpoint`);
        } else if (status === 429) {
          throw new Error('Rate limit exceeded: Too many requests or quota exceeded');
        } else if (status >= 500) {
          throw new Error('Server error: The API provider is experiencing issues');
        }
      }
      
      console.error('Custom LLM error:', error);
      throw new Error(error.response?.data?.error?.message || error.message || `Failed to get response from ${this.modelType || 'custom'} model`);
    }
  }

  _estimateTokenCount(messages) {
    let totalChars = 0;
    messages.forEach(msg => {
      if (typeof msg === 'string') totalChars += msg.length;
      else if (msg.content) totalChars += msg.content.length;
    });
    return Math.ceil(totalChars / 4);
  }
}