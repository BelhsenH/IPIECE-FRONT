import { useEffect, useState, useCallback } from 'react';
import WebSocketService, { WebSocketMessage } from '../services/websocketService';
import { useAuth } from '../contexts/AuthContext';

export interface UseWebSocketOptions {
  autoConnect?: boolean;
  reconnectOnAuth?: boolean;
}

export interface WebSocketHook {
  isConnected: boolean;
  lastMessage: WebSocketMessage | null;
  connectionState: number | null;
  connect: () => void;
  disconnect: () => void;
  subscribe: (messageType: string, handler: (message: WebSocketMessage) => void) => () => void;
  send: (message: WebSocketMessage) => boolean;
  joinConversation: (conversationId: string) => boolean;
  leaveConversation: (conversationId: string) => boolean;
  sendTyping: (conversationId: string, isTyping: boolean) => boolean;
}

export const useWebSocket = (options: UseWebSocketOptions = {}): WebSocketHook => {
  const { autoConnect = true, reconnectOnAuth = true } = options;
  const { token, user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [connectionState, setConnectionState] = useState<number | null>(null);

  const connect = useCallback(() => {
    if (token) {
      WebSocketService.connect();
    }
  }, [token]);

  const disconnect = useCallback(() => {
    WebSocketService.disconnect();
  }, []);

  const subscribe = useCallback((messageType: string, handler: (message: WebSocketMessage) => void) => {
    return WebSocketService.subscribe(messageType, handler);
  }, []);

  const send = useCallback((message: WebSocketMessage) => {
    return WebSocketService.send(message);
  }, []);

  const joinConversation = useCallback((conversationId: string) => {
    return WebSocketService.joinConversation(conversationId);
  }, []);

  const leaveConversation = useCallback((conversationId: string) => {
    return WebSocketService.leaveConversation(conversationId);
  }, []);

  const sendTyping = useCallback((conversationId: string, isTyping: boolean) => {
    return WebSocketService.sendTyping(conversationId, isTyping);
  }, []);

  // Auto-connect when token is available
  useEffect(() => {
    if (autoConnect && token) {
      connect();
    }
    
    if (!token) {
      disconnect();
    }
  }, [autoConnect, token, connect, disconnect]);

  // Reconnect when user changes (if enabled)
  useEffect(() => {
    if (reconnectOnAuth && token && user) {
      connect();
    }
  }, [reconnectOnAuth, token, user, connect]);

  // Subscribe to connection changes
  useEffect(() => {
    const unsubscribe = WebSocketService.onConnectionChange((connected: boolean) => {
      setIsConnected(connected);
      setConnectionState(WebSocketService.getConnectionState());
    });

    return unsubscribe;
  }, []);

  // Subscribe to all messages to track the last one
  useEffect(() => {
    const unsubscribe = WebSocketService.subscribe('*', (message: WebSocketMessage) => {
      setLastMessage(message);
    });

    return unsubscribe;
  }, []);

  // Update connection state periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setConnectionState(WebSocketService.getConnectionState());
      setIsConnected(WebSocketService.isConnected());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return {
    isConnected,
    lastMessage,
    connectionState,
    connect,
    disconnect,
    subscribe,
    send,
    joinConversation,
    leaveConversation,
    sendTyping,
  };
};

// Specialized hook for conversation screens
export const useConversationWebSocket = () => {
  const webSocket = useWebSocket();
  const [conversations, setConversations] = useState<any[]>([]);

  const updateConversationWithMessage = useCallback((message: WebSocketMessage) => {
    if (message.type === 'new_message' && message.conversationId) {
      setConversations(prev => 
        prev.map(conv => {
          if (conv._id === message.conversationId) {
            return {
              ...conv,
              lastMessage: message.data,
              messages: [...(conv.messages || []), message.data],
              updatedAt: new Date()
            };
          }
          return conv;
        })
      );
    }
  }, []);

  const markConversationAsRead = useCallback((conversationId: string, userId: string) => {
    setConversations(prev =>
      prev.map(conv => {
        if (conv._id === conversationId) {
          return {
            ...conv,
            participants: conv.participants.map((p: any) => {
              if (p.user && p.user._id === userId) {
                return { ...p, unreadCount: 0 };
              }
              return p;
            })
          };
        }
        return conv;
      })
    );
  }, []);

  const addNewConversation = useCallback((conversation: any) => {
    setConversations(prev => [conversation, ...prev]);
  }, []);

  return {
    ...webSocket,
    conversations,
    setConversations,
    updateConversationWithMessage,
    markConversationAsRead,
    addNewConversation,
  };
};
