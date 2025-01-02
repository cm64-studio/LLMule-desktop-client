# LLMule Desktop

LLMule Desktop is an Electron-based application that enables users to share their locally running LLMs with the LLMule network, creating a decentralized P2P network for AI inference.

## Features

- Auto-detection of local LLM services (Ollama, LM Studio, and EXO)
- Real-time model status monitoring  
- Token usage tracking and analytics
- Automatic reconnection handling
- Secure websocket communication
- System tray integration with status indicators

## Prerequisites

- Node.js >= 18
- One or more supported LLM services:
 - Ollama (port 11434)
 - LM Studio (port 1234) 
 - EXO (port 52415)

## Installation

```bash
git clone https://github.com/cm64/llmule-desktop-client
cd llmule-desktop-client
npm install
# Start dev server
npm run dev 

# Build for production
npm run build

# Package for your platform
npm run package:mac      # macOS universal binary
npm run package:mac-arm64  # Apple Silicon
npm run package:mac-x64    # Intel
```

## Configuration
Create a .env file:
```
API_URL=http://localhost:3000
WS_URL=ws://localhost:3000/llm-network
```

## Contributing

Contributions are welcome! Please feel free to submit a PR.

## License

This project is open-sourced under the MIT License

Let's make AI inference decentralized!

@andycufari
