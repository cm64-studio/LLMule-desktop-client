import React from 'react';
import { useUI } from '../../contexts/NetworkContext';
import ChatSidebar from './ChatSidebar';
import ChatInterface from './ChatInterface';

export default function ChatView() {
  const { isSidebarOpen } = useUI();

  return (
    <div className="flex-1 flex h-[calc(100vh-115px)]">
      {isSidebarOpen && <ChatSidebar />}
      <div className="flex-1 flex flex-col bg-gray-900">
        <ChatInterface />
      </div>
    </div>
  );
} 