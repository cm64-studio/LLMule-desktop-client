import React, { useState, useEffect } from 'react'
import { Toaster } from 'react-hot-toast'
import { NetworkProvider } from './contexts/NetworkContext'
import MainLayout from './components/layouts/MainLayout'
import StatusBar from './components/StatusBar'
import ModelList from './components/ModelList'
import ActivityLog from './components/ActivityLog'
import NetworkStats from './components/NetworkStats'
import AuthScreen from './components/auth/AuthScreen'

function App() {
  const [authStatus, setAuthStatus] = useState({ loading: true, authenticated: false })

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const apiKey = await window.electron.store.get('apiKey')
      if (!apiKey) {
        setAuthStatus({ loading: false, authenticated: false })
        return
      }
      
      // Get auth status from the server
      const status = await window.electron.auth.getStatus()
      setAuthStatus({ loading: false, authenticated: status.authenticated })
      
      if (!status.authenticated) {
        // Clear invalid API key
        await window.electron.store.set('apiKey', null)
      }
    } catch (error) {
      console.error('Auth check failed:', error)
      setAuthStatus({ loading: false, authenticated: false })
      // Clear API key on error
      await window.electron.store.set('apiKey', null)
    }
  }

  if (authStatus.loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-gray-400">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400 mx-auto mb-4"></div>
          <div>Loading...</div>
        </div>
      </div>
    )
  }

  if (!authStatus.authenticated) {
    return <AuthScreen />
  }

  return (
    <NetworkProvider>
      <div className="min-h-screen bg-gray-900 text-white flex flex-col">
        {/* Header */}
        <header className="fixed top-0 left-0 right-0 z-10 bg-gray-900 border-b border-gray-800">
          <MainLayout>
            <StatusBar />
          </MainLayout>
        </header>

        {/* Main Content */}
        <main className="flex-1 mt-[65px] mb-[120px]"> {/* Adjust mt/mb based on header/footer height */}
          <div className="mx-auto w-full h-full p-4">
            <div className="space-y-4">
              <div className="bg-gray-800 rounded-lg p-4">
                <ModelList />
              </div>
              <div className="bg-gray-800 rounded-lg p-4">
                <ActivityLog />
              </div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="fixed bottom-0 left-0 right-0 z-10 bg-gray-900 border-t border-gray-800">
          <div className="text-center text-gray-400 text-sm py-4">
            🦾 LLMule Network - Decentralizing AI
          </div>
          <NetworkStats />
        </footer>
      </div>
      <Toaster 
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#1f2937',
            color: '#fff',
            borderRadius: '8px',
            border: '1px solid #374151'
          }
        }}
      />
    </NetworkProvider>
  )
}

export default App