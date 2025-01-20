# LLMule Chat Module Documentation

## Overview
The Chat Module is a ChatGPT-like interface that allows users to interact with various AI models through the LLMule API. It provides a modern, responsive chat interface with support for multiple conversations, model selection, and real-time updates.

## Features
- Multiple conversation support with persistent storage
- Real-time model detection and updates
- Conversation history management
- Dynamic model switching within conversations
- Advanced markdown and code syntax highlighting
- Message editing and regeneration
- Copy to clipboard functionality
- Responsive design with mobile support
- Activity logging for shared models
- Balance tracking
- Network status monitoring

## UI Components

### Chat Interface
- Full-width layout with centered content container
- Sticky header with model selector
- Message thread with alternating backgrounds
- Fixed input area at bottom
- Loading states and feedback indicators
- Support for markdown and code formatting
- Message actions (edit, delete, regenerate, copy)

### Model Selector
- Dropdown with local/remote model indication
- Visual feedback for selected model
- Disabled state during loading
- Hover states and transitions
- Support for multiple model types

### Message Component
- User/Assistant differentiation
- Code block with syntax highlighting
- Copy code button
- Edit/Delete/Regenerate actions for user messages
- Timestamp and edit indicators
- Responsive layout for all screen sizes

### Chat Input
- Multi-line support
- Keyboard shortcuts
- Loading state
- Character count (optional)
- Placeholder text
- Focus states

## Architecture

### Core Components

#### NetworkContext
Manages:
- Network connection state
- Model detection (both local and API)
- Activity tracking
- Balance updates
- WebSocket connections for sharing

```javascript
const NetworkContext = {
  // State
  isConnected: boolean,
  localModels: Model[],
  networkModels: Model[],
  isDetecting: boolean,
  balance: number,
  activity: Activity[],

  // Actions
  connect: () => Promise<void>,
  disconnect: () => Promise<void>,
  refreshModels: () => Promise<void>,
}
```

#### ChatContext
Manages:
- Conversations state
- Message handling
- Model selection
- Local storage persistence
- Message editing and regeneration

```javascript
const ChatContext = {
  // State
  conversations: Conversation[],
  currentConversation: Conversation,
  isLoading: boolean,
  isSaving: boolean,

  // Actions
  sendMessage: (content: string, modelId: string) => Promise<void>,
  editMessage: (messageIndex: number, content: string, regenerate: boolean) => void,
  deleteMessage: (messageIndex: number) => void,
  regenerateResponse: (messageIndex: number) => Promise<void>,
  updateConversationTitle: (title: string) => void,
}
```

### Data Flow

1. **Initialization**
   ```javascript
   // Load saved conversations
   const stored = localStorage.getItem('llmule_conversations');
   if (stored) {
     const validConversations = validateConversations(JSON.parse(stored));
     setConversations(validConversations);
   }
   ```

2. **Message Handling**
   ```javascript
   // Send message
   const handleSend = async (content) => {
     // Update UI immediately
     updateConversationWithUserMessage(content);
     
     // Send to API
     const response = await sendToAPI(content);
     
     // Update with response
     updateConversationWithAssistantMessage(response);
   };
   ```

3. **Model Switching**
   ```javascript
   const handleModelChange = (modelId) => {
     if (currentConversation) {
       changeConversationModel(currentConversation.id, modelId);
     } else {
       createNewConversation(modelId);
     }
   };
   ```

### Storage
- Conversations stored in localStorage
- Debounced saving to prevent performance issues
- Validation on load to ensure data integrity
- Automatic cleanup of invalid data

### Error Handling
- Network errors with retry logic
- Model availability checks
- Input validation
- Graceful degradation
- User feedback through toasts

## Best Practices
1. Always validate conversation data before storing
2. Use debounce for frequent operations
3. Provide immediate feedback for user actions
4. Handle all error cases gracefully
5. Maintain responsive design across all screen sizes
6. Keep UI state in sync with backend
7. Use proper keyboard navigation support

## Future Improvements
1. Conversation search and filtering
2. Advanced model parameters
3. File attachments
4. Conversation sharing
5. Message reactions
6. Custom themes
7. Voice input/output
8. Context length management
9. Model performance metrics
10. Conversation categories/folders

## Dependencies
- React for UI components
- Tailwind CSS for styling
- React Markdown for message rendering
- Prism for code syntax highlighting
- Heroicons for icons
- React Hot Toast for notifications
- Axios for API calls 