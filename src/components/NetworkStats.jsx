import React, { useState, useEffect } from 'react'
import { useNetwork } from '../contexts/NetworkContext'
import { ArrowUpIcon, ArrowDownIcon, ShareIcon } from '@heroicons/react/24/solid'

export default function NetworkStats() {
  const { balance, tokenStats = { tokensPerMinute: 0, tokensPerSecond: 0 }, isConnected } = useNetwork()
  const [appVersion, setAppVersion] = useState('')

  useEffect(() => {
    const getVersion = async () => {
      try {
        const version = await window.electron.app.getVersion()
        setAppVersion(version)
      } catch (error) {
        console.error('Failed to get app version:', error)
      }
    }
    getVersion()
  }, [])

  return (
    <div className="bg-gray-800/80 backdrop-blur-sm border-t border-gray-700 shadow-lg">
      <div className="px-4 py-2.5 max-w-screen-2xl mx-auto">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md ${
                isConnected 
                  ? 'bg-green-500/10 border border-green-500/30' 
                  : 'bg-gray-700/50 border border-gray-700'
              }`}>
                <ShareIcon className={`w-3.5 h-3.5 ${isConnected ? 'text-green-500' : 'text-gray-400'}`} />
                <span className={`text-xs font-medium ${isConnected ? 'text-green-400' : 'text-gray-400'}`}>
                  {isConnected ? 'Sharing' : 'Not Sharing'}
                </span>
              </div>
            </div>
            
            {isConnected ? (
              <>
                <div className="flex items-center gap-2">
                  <ArrowUpIcon className="w-4 h-4 text-green-500" />
                  <span className="text-gray-300 text-sm">
                    {tokenStats.tokensPerMinute > 0 
                      ? `Processing: ${tokenStats.tokensPerMinute} tokens/min`
                      : 'Waiting for requests...'}
                  </span>
                </div>
                {tokenStats.tokensPerMinute > 0 && (
                  <div className="flex items-center gap-2">
                    <ArrowDownIcon className="w-4 h-4 text-blue-500" />
                    <span className="text-gray-300 text-sm">Rate: {tokenStats.tokensPerSecond} tokens/sec</span>
                  </div>
                )}
              </>
            ) : (
              <span className="text-gray-400 text-sm">Network models still available with MULE tokens</span>
            )}
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-sm px-3 py-1 bg-blue-500/10 border border-blue-500/30 rounded-md">
              <span className="text-gray-300">Balance: </span>
              <span className="text-white font-mono font-medium">{Number(balance).toFixed(6)} MULE(s)</span>
            </div>
            {appVersion && (
              <div className="text-xs text-gray-500">
                v{appVersion}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}