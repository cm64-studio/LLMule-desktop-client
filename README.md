# LLMule Desktop

LLMule Desktop is a powerful desktop application that lets you chat with AI models while maintaining complete privacy. It automatically detects your local LLM services and allows you to share them with the LLMule network, creating a decentralized P2P network for AI inference.

<div align="center">
  <img src="https://llmule-public.s3.us-east-1.amazonaws.com/LLMule.gif" alt="LLMule Desktop Demo" style="max-width: 100%; width: 100%;" />
  <p><em>LLMule Desktop - Chat with local & network models seamlessly</em></p>
</div>

## 🚀 Key Features

- **Privacy-First Chat Interface**
  - Chat with local models with complete privacy - your conversations never leave your computer
  - Modern, intuitive UI with real-time responses
  - Support for system prompts and conversation management
  - Enhanced code block rendering with syntax highlighting and easy copying
  - Improved error handling with clear error messages

- **Seamless Model Integration**
  - Auto-detection of local LLM services (Ollama, LM Studio, and EXO)
  - No configuration needed - just install and start chatting
  - Easy switching between local and network models
  - Support for custom models with manual configuration
  - Search models by name or username for quick access

- **Model Sharing & Network**
  - Optional: Share your local models with the LLMule network
  - Access shared models from other users
  - Built-in token usage tracking and analytics
  - Real-time model status monitoring
  - Simplified model quality tiers with intuitive labels

- **Security & Privacy**
  - Local models run completely offline
  - Anonymous chat with network models
  - Secure websocket communication
  - Clear visual indicators for local vs. network models

## 🔧 Prerequisites

- Node.js >= 18
- One or more supported LLM services:
  - [Ollama](https://ollama.ai) (port 11434)
  - [LM Studio](https://lmstudio.ai) (port 1234) 
  - [EXO](https://github.com/exo-explore/exo) (port 52415)
  - [vLLM](https://github.com/vllm-project/vllm) (port 8000)

## 💻 Installation

Download the latest release for your platform from the [releases page](https://llmule.xyz).

Or build from source:

```bash
git clone https://github.com/cm64/LLMule-desktop-client.git
cd LLMule-desktop-client
npm install

# Start in development mode
npm run dev 

# Build for production
npm run build

# Package for your platform
npm run package:mac      # macOS universal binary
npm run package:mac-arm64  # Apple Silicon
npm run package:mac-x64    # Intel
npm run package:win      # Windows
```

## 🧠 Adding Custom Models

LLMule Desktop now supports adding custom models to enhance your AI experience:

### Using Local Model Services

1. **Ollama**: Add custom models using `ollama pull [model]` command
2. **LM Studio**: Import custom GGUF models through the LM Studio interface
3. **EXO**: Configure custom models in the EXO settings
4. **vLLM**: Deploy custom models following vLLM documentation

### Custom Model Configuration

Custom models will be automatically detected when you start the supported services. The model selector will display all available models with appropriate indicators for local models.

Benefits of custom models:
- Use specialized models for specific tasks
- Access the latest open-source models
- Share your custom models with the network
- Maintain complete privacy with local inference

## 🔄 What's New in This Version

- **Enhanced UI/UX**: Modernized interface with improved visual hierarchy and feedback
- **Improved Code Blocks**: Cleaner code display with better syntax highlighting
- **Search Enhancements**: Find models by name or username
- **Better Error Handling**: Clear error messages and automatic recovery
- **Simplified Model Tiers**: More intuitive quality indicators for different model capabilities
- **Performance Improvements**: Faster model loading and response times

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a PR.

## 📝 License

This project is open-sourced under the MIT License.

---

Built with 💾 by [@andycufari](https://github.com/andycufari)

Let's make AI inference decentralized and privacy-focused!
