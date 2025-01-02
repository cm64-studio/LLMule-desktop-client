import React, { useState } from 'react'
import toast from 'react-hot-toast'

export default function AuthScreen() {
  const [apiKey, setApiKey] = useState('')
  const [email, setEmail] = useState('')
  const [isRequestingKey, setIsRequestingKey] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmitApiKey = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    
    if (!apiKey.trim()) {
      setError('Please enter an API key')
      setIsLoading(false)
      return
    }

    try {
      // First store the API key
      await window.electron.store.set('apiKey', apiKey)
      
      // Then validate it
      const isValid = await window.electron.auth.getStatus()
      
      if (!isValid.authenticated) {
        throw new Error('Invalid API key')
      }
      
      toast.success('Successfully connected!')
      window.location.reload()
    } catch (error) {
      const message = error.message || 'Failed to validate API key'
      toast.error(message)
      setError(message)
      // Clear invalid API key
      await window.electron.store.set('apiKey', null)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRequestKey = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    if (!email.trim()) {
      setError('Please enter your email')
      setIsLoading(false)
      return
    }

    try {
      await window.electron.auth.register(email)
      toast.success('Check your email for your API key')
      setIsRequestingKey(false)
    } catch (error) {
      const message = error.message || 'Failed to request API key'
      toast.error(message)
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white">Welcome to LLMule</h1>
          <p className="mt-2 text-gray-400">Share your LLMs with the world</p>
        </div>

        {!isRequestingKey ? (
          <>
            <form onSubmit={handleSubmitApiKey} className="mt-8 space-y-6">
              <div>
                <label htmlFor="apiKey" className="block text-sm font-medium text-gray-400">
                  API Key
                </label>
                <input
                  type="text"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className={`mt-1 block w-full rounded-md bg-gray-800 border ${
                    error ? 'border-red-500' : 'border-gray-700'
                  } text-white px-3 py-2`}
                  placeholder="llm_..."
                  disabled={isLoading}
                />
                {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2 px-4 rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Connecting...' : 'Connect'}
              </button>
              <button
                type="button"
                onClick={() => setIsRequestingKey(true)}
                disabled={isLoading}
                className="w-full py-2 text-sm text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Need an API key?
              </button>
            </form>
          </>
        ) : (
          <form onSubmit={handleRequestKey} className="mt-8 space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-400">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`mt-1 block w-full rounded-md bg-gray-800 border ${
                  error ? 'border-red-500' : 'border-gray-700'
                } text-white px-3 py-2`}
                placeholder="you@example.com"
                disabled={isLoading}
              />
              {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2 px-4 rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Requesting...' : 'Request API Key'}
            </button>
            <button
              type="button"
              onClick={() => setIsRequestingKey(false)}
              disabled={isLoading}
              className="w-full py-2 text-sm text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Back to login
            </button>
          </form>
        )}
      </div>
    </div>
  )
}