import React, { createContext, useContext, useEffect, useRef, ReactNode } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import WebSocketService, { WebSocketMessage } from '../services/websocketService';
import { useAuth } from './AuthContext';

interface WebSocketContextType {
  isConnected: boolean;
  sendMessage: (message: any) => void;
  joinConversation: (conversationId: string) => void;
  leaveConversation: (conversationId: string) => void;
  sendTypingIndicator: (conversationId: string, isTyping: boolean) => void;
  addListener: (listener: (message: WebSocketMessage) => void) => () => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

interface WebSocketProviderProps {
  children: ReactNode;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ children }) => {
  const { token } = useAuth();
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (token) {
      // Connect when we have a token
      WebSocketService.connect();
    } else {
      // Disconnect when token is removed
      WebSocketService.disconnect();
    }

    return () => {
      WebSocketService.disconnect();
    };
  }, [token]);

  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        // App has come to the foreground - reconnect if needed
        if (token && !WebSocketService.isConnected()) {
          // Clear any pending reconnect timeout
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
          }
          
          // Reconnect after a short delay to ensure app is fully active
          reconnectTimeoutRef.current = setTimeout(() => {
            WebSocketService.connect();
          }, 1000);
        }
      } else if (nextAppState.match(/inactive|background/)) {
        // App is going to background - disconnect to save resources
        WebSocketService.disconnect();
      }

      appStateRef.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription?.remove();
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [token]);

  const contextValue: WebSocketContextType = {
    isConnected: WebSocketService.isConnected(),
    sendMessage: WebSocketService.send.bind(WebSocketService),
    joinConversation: WebSocketService.joinConversation.bind(WebSocketService),
    leaveConversation: WebSocketService.leaveConversation.bind(WebSocketService),
    sendTypingIndicator: WebSocketService.sendTyping.bind(WebSocketService),
    addListener: WebSocketService.subscribe.bind(WebSocketService),
  };

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = (): WebSocketContextType => {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};

export default WebSocketContext;