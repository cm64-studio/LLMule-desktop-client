import { ipcMain } from 'electron'
import axios from 'axios'
import Store from 'electron-store'
import config from '../config.js'

const store = new Store()

// Create axios instance with default config
const api = axios.create({
  baseURL: config.API_URL,
  timeout: 10000,
})

// Add request interceptor to log requests
api.interceptors.request.use(config => {
  console.log(`Making request to ${config.url} with baseURL ${config.baseURL}`)
  return config
})

// Add response interceptor to log responses
api.interceptors.response.use(
  response => {
    console.log(`Response from ${response.config.url}:`, response.status)
    return response
  },
  error => {
    console.error('API Error:', error.response?.data || error.message)
    throw error
  }
)

export function setupAuthHandlers() {
  ipcMain.handle('auth:register', async (_, email) => {
    try {
      const response = await api.post('/auth/register', { email })
      return response.data
    } catch (error) {
      console.error('Registration failed:', error.response?.data || error.message)
      throw new Error(error.response?.data?.message || 'Registration failed')
    }
  })

  ipcMain.handle('auth:checkVerification', async () => {
    try {
      const apiKey = store.get('apiKey')
      const response = await api.get('/auth/me', {
        headers: { Authorization: `Bearer ${apiKey}` }
      })
      return response.data.verified === true
    } catch (error) {
      console.error('Verification check failed:', error.response?.data || error.message)
      return false
    }
  })

  ipcMain.handle('auth:getStatus', async () => {
    const apiKey = store.get('apiKey')
    if (!apiKey) return { authenticated: false }

    try {
      const response = await api.get('/auth/me', {
        headers: { Authorization: `Bearer ${apiKey}` }
      })
      console.log('Auth status response:', response.data)
      
      return {
        authenticated: true,
        user: response.data
      }
    } catch (error) {
      console.error('Auth status check failed:', error.response?.data || error.message)
      return { authenticated: false }
    }
  })

  ipcMain.handle('auth:getBalance', async () => {
    const apiKey = store.get('apiKey')
    if (!apiKey) return { mule_balance: 0 }

    try {
      console.log('Fetching balance from:', `${config.API_URL}/v1/balance`)
      const response = await api.get('/v1/balance', {
        headers: { 
          Authorization: `Bearer ${apiKey}`,
          'Accept': 'application/json'
        }
      })
      console.log('Raw balance response:', response.data)
      return response.data
    } catch (error) {
      console.error('Balance check failed:', error.response?.data || error.message)
      if (error.response) {
        console.error('Error status:', error.response.status)
        console.error('Error headers:', error.response.headers)
      }
      return { mule_balance: 0 }
    }
  })
}