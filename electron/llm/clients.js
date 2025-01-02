import axios from 'axios';

class LLMClient {
  async generateCompletion(model, messages, options = {}) {
    throw new Error('Method not implemented');
  }
}

export class OllamaClient extends LLMClient {
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
  async generateCompletion(model, messages, options = {}) {
    try {
      const response = await axios.post(
        'http://localhost:1234/v1/chat/completions',
        {
          model,
          messages,
          temperature: options.temperature || 0.7,
          max_tokens: options.max_tokens || 4096,
          stream: false
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
      throw new Error(`LM Studio error: ${error.message}`);
    }
  }
}

export class ExoClient extends LLMClient {
  async generateCompletion(model, messages, options = {}) {
    try {
      const response = await axios.post(
        'http://localhost:52415/v1/chat/completions',
        {
          model,
          messages,
          temperature: options.temperature || 0.7,
          max_tokens: options.max_tokens || 4096,
          stream: false
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
      throw new Error(`EXO error: ${error.message}`);
    }
  }
}