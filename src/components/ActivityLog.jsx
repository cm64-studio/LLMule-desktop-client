import React from 'react'
import { useNetwork } from '../contexts/NetworkContext'

export default function ActivityLog() {
  const { activity } = useNetwork()

  const getActivityIcon = (type) => {
    switch (type) {
      case 'completion_start':
        return '⏳'
      case 'completion_success':
        return '✅'
      case 'completion_error':
        return '❌'
      default:
        return '📝'
    }
  }

  return (
    <div className="flex flex-col">
      <h2 className="text-xl text-white mb-4">Activity Log</h2>
      
      <div className="flex-1 overflow-y-auto min-h-0 font-mono">
        {activity.length === 0 ? (
          <div className="text-gray-400 text-center py-8">
            <p>No activity yet</p>
            <p className="text-sm mt-2">Start sharing to see requests</p>
          </div>
        ) : (
          <div className="space-y-1">
            {activity.map((log, index) => (
              <div 
                key={index}
                className="bg-gray-800/50 hover:bg-gray-800 transition-colors rounded-md px-3 py-2 text-sm"
              >
                <div className="flex items-start gap-2">
                  <span className="text-gray-400 select-none">{getActivityIcon(log.type)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-green-400">{log.type}</span>
                      <span className="text-gray-500 text-xs">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-gray-300 break-all">{log.message}</p>
                    {log.tokens && (
                      <p className="text-gray-500 text-xs mt-1">
                        Tokens: {log.tokens.total_tokens} (prompt: {log.tokens.prompt_tokens}, completion: {log.tokens.completion_tokens})
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}