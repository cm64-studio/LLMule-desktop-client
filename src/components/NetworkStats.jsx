import React from 'react'
import { useNetwork } from '../contexts/NetworkContext'
import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/solid'

export default function NetworkStats() {
  const { balance, tokenStats, isConnected } = useNetwork()

  return (
    <div className="bg-gray-900 border-t border-gray-800 p-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-6">
          {isConnected && (
            <>
              <div className="flex items-center gap-2">
                <ArrowUpIcon className="w-4 h-4 text-green-500" />
                <span className="text-gray-400 text-sm">
                  {tokenStats.tokensPerMinute > 0 
                    ? `Processing: ${tokenStats.tokensPerMinute} tokens/min`
                    : 'Waiting for requests...'}
                </span>
              </div>
              {tokenStats.tokensPerMinute > 0 && (
                <div className="flex items-center gap-2">
                  <ArrowDownIcon className="w-4 h-4 text-blue-500" />
                  <span className="text-gray-400 text-sm">Rate: {tokenStats.tokensPerSecond} tokens/sec</span>
                </div>
              )}
            </>
          )}
        </div>
        
        <div className="flex items-center gap-4">
          <div className="text-sm">
            <span className="text-gray-400">Balance: </span>
            <span className="text-white font-mono">{Number(balance).toFixed(6)} MULE</span>
          </div>
        </div>
      </div>
    </div>
  )
}