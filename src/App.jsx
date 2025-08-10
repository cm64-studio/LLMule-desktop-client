import React, { useState, useEffect } from 'react'
import { Toaster } from 'react-hot-toast'
import { NetworkProvider } from './contexts/NetworkContext'
import { UIProvider } from './contexts/NetworkContext'
import { ChatProvider } from './contexts/ChatContext'
import MainLayout from './components/layouts/MainLayout'
import StatusBar from './components/StatusBar'
import ModelList from './components/ModelList'
import ActivityLog from './components/ActivityLog'
import NetworkStats from './components/NetworkStats'
import AuthScreen from './components/auth/AuthScreen'
import ChatView from './components/chat/ChatView'
import { ChatBubbleLeftRightIcon, ShareIcon } from '@heroicons/react/24/outline'

function App() {
  const [authStatus, setAuthStatus] = useState({ loading: true, authenticated: false })
  const [activeView, setActiveView] = useState('chat') // 'chat' or 'network'

  useEffect(() => {
    checkAuth()
    // Hide splash screen once React app is mounted
    const splashScreen = document.getElementById('splash-screen')
    if (splashScreen) {
      splashScreen.style.opacity = '0'
      splashScreen.style.transition = 'opacity 0.5s ease-out'
      setTimeout(() => {
        splashScreen.style.display = 'none'
      }, 500)
    }
    
  }, [])

  const checkAuth = async () => {
    try {
      const apiKey = await window.electron.store.get('apiKey')
      if (!apiKey) {
        setAuthStatus({ loading: false, authenticated: false })
        return
      }
      
      const status = await window.electron.auth.getStatus()
      setAuthStatus({ loading: false, authenticated: status.authenticated })
      
      if (!status.authenticated) {
        await window.electron.store.set('apiKey', null)
      }
    } catch (error) {
      console.error('Auth check failed:', error)
      setAuthStatus({ loading: false, authenticated: false })
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
      <UIProvider>
        <ChatProvider>
          <div className="min-h-screen bg-gray-900 text-white flex flex-col">
            {/* Header */}
            <header className="fixed top-0 left-0 right-0 z-10 bg-gray-900 border-b border-gray-800">
              <MainLayout>
                <div className="flex items-center gap-4">
                  
                  <div className="h-6 border-r border-gray-700" />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setActiveView('chat')}
                      className={`flex items-center gap-2 px-3 py-1 rounded-full ${
                        activeView === 'chat' ? 'bg-blue-600' : 'bg-gray-800 hover:bg-gray-700'
                      }`}
                    >
                      <ChatBubbleLeftRightIcon className="w-4 h-4" />
                      <span>Chat</span>
                    </button>
                    <button
                      onClick={() => setActiveView('network')}
                      className={`flex items-center gap-2 px-3 py-1 rounded-full ${
                        activeView === 'network' ? 'bg-blue-600' : 'bg-gray-800 hover:bg-gray-700'
                      }`}
                    >
                      <ShareIcon className="w-4 h-4" />
                      <span>Network</span>
                    </button>
                  </div>
                  <StatusBar />
                </div>
              </MainLayout>
            </header>

            {/* Main Content */}
            <main className="flex-1 pt-[62px]">
              {activeView === 'chat' ? (
                <ChatView />
              ) : (
                <div className="mx-auto w-full h-[calc(100vh-138px)] p-4 pb-4">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
                    <div className="bg-gray-800 rounded-lg p-4 overflow-auto">
                      <ModelList />
                    </div>
                    <div className="bg-gray-800 rounded-lg p-4 flex flex-col h-full overflow-hidden">
                      <ActivityLog />
                    </div>
                  </div>
                </div>
              )}
            </main>

            {/* Footer */}
            <footer className="fixed bottom-0 left-0 right-0 z-10 bg-gray-900 border-t border-gray-800">
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
        </ChatProvider>
      </UIProvider>
    </NetworkProvider>
  )
}

export default App