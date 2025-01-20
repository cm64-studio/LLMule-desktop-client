const config = {
  development: {
    API_URL: 'http://localhost:3000',
    WS_URL: 'ws://localhost:3000/llm-network'
  },
  production: {
    API_URL: 'https://api.llmule.xyz',
    WS_URL: 'wss://api.llmule.xyz/llm-network'
  }
}

// Force production environment by default
const env = 'production'
console.log('Current environment:', env, 'using API:', config[env].API_URL)
export default config[env]