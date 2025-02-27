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
    <div className="flex flex-col h-full max-h-full">
      <div className="flex justify-between items-center mb-3 flex-shrink-0">
        <h2 className="text-xl text-white">Activity Log</h2>
        <span className="text-xs text-gray-400 bg-gray-700/50 px-2 py-1 rounded-md">
          {activity.length} {activity.length === 1 ? 'entry' : 'entries'}
        </span>
      </div>
      
      <div className="overflow-y-auto flex-1 min-h-0 pr-1 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
        {activity.length === 0 ? (
          <div className="text-gray-400 text-center py-8 bg-gray-800/30 rounded-lg border border-gray-700/50">
            <p>No activity yet</p>
            <p className="text-sm mt-2">Start sharing to see requests</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {activity.map((log, index) => (
              <div 
                key={index}
                className="bg-gray-800/50 hover:bg-gray-700/50 transition-colors rounded-md px-3 py-2 text-sm border border-gray-700/30"
              >
                <div className="flex items-start gap-2">
                  <span className="text-gray-400 select-none flex-shrink-0">{getActivityIcon(log.type)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <span className={`${
                        log.type === 'completion_success' ? 'text-green-400' : 
                        log.type === 'completion_error' ? 'text-red-400' : 
                        'text-blue-400'
                      }`}>
                        {log.type.replace('completion_', '')}
                      </span>
                      <span className="text-gray-500 text-xs">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-gray-300 break-all mt-1">{log.message}</p>
                    {log.tokens && (
                      <div className="text-gray-500 text-xs mt-1.5 flex flex-wrap gap-x-3">
                        <span>Total: <span className="text-green-300">{log.tokens.total_tokens}</span></span>
                        <span>Prompt: <span className="text-blue-300">{log.tokens.prompt_tokens}</span></span>
                        <span>Completion: <span className="text-purple-300">{log.tokens.completion_tokens}</span></span>
                      </div>
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