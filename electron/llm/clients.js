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