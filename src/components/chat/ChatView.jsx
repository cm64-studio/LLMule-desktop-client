import React from 'react';
import ChatSidebar from './ChatSidebar';
import ChatInterface from './ChatInterface';

export default function ChatView() {
  return (
    <div className="flex-1 flex h-[calc(100vh-120px)]">
      <ChatSidebar />
      <div className="flex-1 flex flex-col bg-gray-900">
        <ChatInterface />
      </div>
    </div>
  );
} 