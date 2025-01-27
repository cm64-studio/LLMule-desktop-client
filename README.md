# LLMule Desktop

LLMule Desktop is a powerful desktop application that lets you chat with AI models while maintaining complete privacy. It automatically detects your local LLM services and allows you to share them with the LLMule network, creating a decentralized P2P network for AI inference.

<div align="center">
  <img src="https://llmule-public.s3.us-east-1.amazonaws.com/LLMule-high.gif" alt="LLMule Desktop Demo" style="max-width: 800px; width: 100%;" />
  <p><em>LLMule Desktop - Chat with local & network models seamlessly</em></p>
</div>

## 🚀 Key Features

- **Privacy-First Chat Interface**
  - Chat with local models with complete privacy - your conversations never leave your computer
  - Modern, intuitive UI with real-time responses
  - Support for system prompts and conversation management

- **Seamless Model Integration**
  - Auto-detection of local LLM services (Ollama, LM Studio, and EXO)
  - No configuration needed - just install and start chatting
  - Easy switching between local and network models

- **Model Sharing & Network**
  - Optional: Share your local models with the LLMule network
  - Access shared models from other users
  - Built-in token usage tracking and analytics
  - Real-time model status monitoring

- **Security & Privacy**
  - Local models run completely offline
  - Anonymous chat with network models
  - Secure websocket communication
  - No API keys or configuration required

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

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a PR.

## 📝 License

This project is open-sourced under the MIT License.

---

Built with ❤️ by [@andycufari](https://github.com/andycufari)

Let's make AI inference decentralized and privacy-focused!
