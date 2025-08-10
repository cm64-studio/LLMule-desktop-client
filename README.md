# 🤝 LLMule Desktop

**An Experimental P2P Network for Sharing GPU Resources**

LLMule Desktop is a community experiment in making AI more accessible by sharing idle GPU power. Chat with local models privately, contribute your unused compute to help others, and access shared models from the community - all while keeping privacy and anonymity at the core.

<div align="center">

[![Watch Demo](https://img.shields.io/badge/▶️_Watch_Demo-FF0000?style=for-the-badge&logo=youtube&logoColor=white)](https://www.youtube.com/watch?v=PebxWZLz_VM)

</div>

<div align="center">
  <img src="https://llmule-public.s3.us-east-1.amazonaws.com/LLMule.gif" alt="LLMule Desktop Demo" style="max-width: 100%; width: 100%;" />
  <p><em>Share idle GPU power. Chat with local and community models. Privacy-first experimental platform.</em></p>
</div>

## 🤔 Why Does This Project Exist?

**💸 GPU Costs Are Insane**  
High-end GPUs cost thousands, but sit idle most of the time. What if we could share that expensive compute power when we're not using it?

**🤝 Community Over Commerce**  
This isn't about making money - it's about empowering the open-source LLM community. We share resources because we believe AI should be accessible, not because we want to get rich.

**🔒 Privacy Matters**  
Local models mean your conversations never leave your computer. For network models, anonymity is built-in. No tracking, no data collection, no surveillance.


## 🌟 What Makes LLMule Special

### 🏠 **Local-First Architecture**
- **Ollama Integration**: Seamlessly manage and chat with Ollama models
- **LM Studio Support**: Connect to your LM Studio setup instantly
- **EXO & vLLM Compatible**: Works with advanced inference engines
- **Custom Models**: Add any OpenAI-compatible API endpoint

### 🌐 **P2P Resource Sharing Network**
- **Share When Idle**: Contribute your unused GPU power to the community
- **Access Shared Models**: Use models from other contributors' hardware
- **Anti-Abuse Tokens**: Simple token system prevents resource abuse (experimental, not monetary)
- **True P2P**: No central servers controlling your data or models

### 🎨 **Decent Chat Interface**
- **Switch Between Models**: Easily test local and shared models
- **Thinking Tags**: See AI reasoning with collapsible `<thinking>` sections  
- **Conversation Management**: Save and organize your chats locally
- **Real-time Streaming**: Watch responses appear as they're generated

### 🔐 **Privacy & Security**
- **Local Models Stay Local**: Your conversations never leave your computer
- **Anonymous P2P**: Network participation doesn't expose your identity
- **Encrypted Storage**: API keys and settings protected locally
- **Open Source**: Transparent code you can verify and modify

## 🚀 Get Started in 60 Seconds

### Option 1: Download & Install (Recommended)
1. **Download** the latest release from [llmule.xyz](https://llmule.xyz)
2. **Install** the app on your platform
3. **Launch** and start chatting with AI models

### Option 2: Build from Source
```bash
git clone https://github.com/cm64/LLMule-desktop-client.git
cd LLMule-desktop-client
npm install

# Development mode
npm run dev

# Build production version
npm run build

# Package for distribution
npm run package:mac-arm64  # Apple Silicon
npm run package:mac-x64    # Intel Mac
npm run package:win        # Windows
npm run package:linux      # Linux
```

## 🛠 Supported AI Platforms

| Platform | Auto-Detection | Installation Help | Model Management |
|----------|:--------------:|:-----------------:|:----------------:|
| **Ollama** | ✅ | ✅ | ✅ Pull, Remove, List |
| **LM Studio** | ✅ | ❌ | ✅ Auto-discover |
| **EXO** | ✅ | ❌ | ✅ Auto-discover |
| **vLLM** | ✅ | ❌ | ✅ Auto-discover |
| **Custom APIs** | ✅ | ✅ | ✅ Full management |

## 💡 How to Use This Experiment

**🔒 For Privacy-Focused Users**
- Use only local models - conversations never leave your machine
- Perfect for sensitive work or personal projects
- No internet required once models are downloaded

**⚗️ For Community Contributors** 
- Share your idle GPU power when you're not using it
- Help others access models they can't run locally
- Earn anti-abuse tokens (experimental, not financial)

**🧪 For Experimenters**
- Test different models easily without complex setup
- Compare local vs. shared model performance
- Contribute to an open experiment in decentralized AI

## 🆕 What's New in v0.2.0

- **🔧 Real Ollama Integration**: No more mocks - full Ollama installation, management, and streaming
- **🛡️ Enhanced Security**: Fixed all critical vulnerabilities, improved encryption
- **💬 Thinking Tags**: Collapsible reasoning sections for supported models
- **⚡ Better Streaming**: Improved real-time response handling
- **🎨 UI Polish**: Smoother animations, better error messages
- **🔗 P2P Stability**: More reliable network connections and reconnection logic

## 🤝 Join the Community

**🎮 Discord**: [Join our community](https://discord.gg/llmule) for support and discussions  
**🐦 Twitter**: [@llmule](https://twitter.com/llmule) for updates and announcements  
**📧 Email**: [hello@llmule.xyz](mailto:hello@llmule.xyz) for partnerships and support  

## 🛣️ Roadmap

- **Q1 2025**: Mobile companion app
- **Q2 2025**: Plugin system for custom integrations  
- **Q3 2025**: Team collaboration features
- **Q4 2025**: Advanced model fine-tuning tools

## ❓ FAQ

**Is this private?**
- **Local models**: 100% private - conversations never leave your computer
- **Network models**: Anonymous - your identity isn't revealed, but you're using someone else's GPU

**What are the tokens about?**
- Simple system to prevent resource abuse (like rate limiting)
- Not money or cryptocurrency - just anti-spam protection
- Experimental feature that might evolve or disappear

---

<div align="center">

**Want to join the experiment?**

[![Try LLMule](https://img.shields.io/badge/Try_The_Experiment-4CAF50?style=for-the-badge&logo=download&logoColor=white)](https://llmule.xyz)
[![Star on GitHub](https://img.shields.io/badge/⭐_Star_on_GitHub-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/cm64/LLMule-desktop-client)

Built with curiosity by [@andycufari](https://github.com/andycufari)  
Experimenting with community-driven AI resource sharing.

</div>