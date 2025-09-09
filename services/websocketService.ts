import AsyncStorage from '@react-native-async-storage/async-storage';
import config from '../config';

export interface WebSocketMessage {
  type: 'conversation_updated' | 'new_message' | 'message_read' | 'conversation_created' | 'typing' | 'user_status';
  data: any;
  conversationId?: string;
  userId?: string;
}

class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private listeners: Map<string, ((message: WebSocketMessage) => void)[]> = new Map();
  private connectionListeners: ((connected: boolean) => void)[] = [];
  private isConnecting = false;
  private userId: string | null = null;
  private enableDebugLogs = false;

  private getWebSocketUrl(): string {
    // Convert HTTP URL to WebSocket URL - keep same port as API
    let wsUrl = config.apiUrl.replace(/^https?:\/\//, 'ws://');
    
    // The WebSocket should use the same port as the API since nginx is proxying on 8888
    return `${wsUrl}/ws`;
  }

  async connect(): Promise<void> {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    this.isConnecting = true;

    try {
      const token = await AsyncStorage.getItem('@auth_token');
      const user = await AsyncStorage.getItem('@auth_user');
      
      if (!token) {
        if (this.enableDebugLogs) console.log('WebSocket: No token available, cannot connect');
        this.isConnecting = false;
        return;
      }

      if (user) {
        this.userId = JSON.parse(user)._id;
      }

      const wsUrl = `${this.getWebSocketUrl()}?token=${encodeURIComponent(token)}`;
      if (this.enableDebugLogs) console.log('WebSocket: Connecting to:', wsUrl);

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        if (this.enableDebugLogs) console.log('WebSocket: Connected');
        this.reconnectAttempts = 0;
        this.isConnecting = false;
        this.notifyConnectionListeners(true);
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          if (this.enableDebugLogs) console.log('WebSocket: Received message:', message);
          this.handleMessage(message);
        } catch (error) {
          if (this.enableDebugLogs) console.error('WebSocket: Error parsing message:', error);
        }
      };

      this.ws.onclose = (event) => {
        if (this.enableDebugLogs) console.log('WebSocket: Connection closed', event.code, event.reason);
        if (this.enableDebugLogs) console.log('WebSocket: Close event details:', { code: event.code, reason: event.reason, wasClean: event.wasClean });
        this.isConnecting = false;
        this.notifyConnectionListeners(false);
        
        // Enhanced reconnection logic with better error handling
        if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
          const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts), 30000); // Max 30s delay
          setTimeout(() => {
            this.reconnectAttempts++;
            if (this.enableDebugLogs) console.log(`WebSocket: Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} (delay: ${delay}ms)`);
            this.connect();
          }, delay);
        } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          if (this.enableDebugLogs) console.error('WebSocket: Max reconnection attempts reached. Connection permanently failed.');
        }
      };

      this.ws.onerror = (error) => {
        if (this.enableDebugLogs) console.error('WebSocket: Error occurred:', {
          error,
          readyState: this.ws?.readyState,
          url: wsUrl,
          timestamp: new Date().toISOString()
        });
        this.isConnecting = false;
        this.notifyConnectionListeners(false);
      };

    } catch (error) {
      if (this.enableDebugLogs) console.error('WebSocket: Connection error:', {
        error: error.message || error,
        url: this.getWebSocketUrl(),
        token: token ? 'present' : 'missing',
        timestamp: new Date().toISOString()
      });
      this.isConnecting = false;
      
      // Attempt reconnection on connection errors too
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts), 30000);
        setTimeout(() => {
          this.reconnectAttempts++;
          if (this.enableDebugLogs) console.log(`WebSocket: Retry connection after error ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
          this.connect();
        }, delay);
      }
    }
  }

  disconnect(): void {
    if (this.ws) {
      if (this.enableDebugLogs) console.log('WebSocket: Disconnecting');
      this.ws.close(1000, 'User disconnected');
      this.ws = null;
    }
    this.reconnectAttempts = this.maxReconnectAttempts; // Prevent reconnection
  }

  private handleMessage(message: WebSocketMessage): void {
    const typeListeners = this.listeners.get(message.type);
    if (typeListeners) {
      typeListeners.forEach(listener => {
        try {
          listener(message);
        } catch (error) {
          if (this.enableDebugLogs) console.error('WebSocket: Error in message listener:', error);
        }
      });
    }

    // Also notify global listeners
    const globalListeners = this.listeners.get('*');
    if (globalListeners) {
      globalListeners.forEach(listener => {
        try {
          listener(message);
        } catch (error) {
          if (this.enableDebugLogs) console.error('WebSocket: Error in global listener:', error);
        }
      });
    }
  }

  private notifyConnectionListeners(connected: boolean): void {
    this.connectionListeners.forEach(listener => {
      try {
        listener(connected);
      } catch (error) {
        if (this.enableDebugLogs) console.error('WebSocket: Error in connection listener:', error);
      }
    });
  }

  // Subscribe to specific message types or all messages with '*'
  subscribe(messageType: string, listener: (message: WebSocketMessage) => void): () => void {
    if (!this.listeners.has(messageType)) {
      this.listeners.set(messageType, []);
    }
    
    this.listeners.get(messageType)!.push(listener);

    // Return unsubscribe function
    return () => {
      const listeners = this.listeners.get(messageType);
      if (listeners) {
        const index = listeners.indexOf(listener);
        if (index > -1) {
          listeners.splice(index, 1);
        }
        if (listeners.length === 0) {
          this.listeners.delete(messageType);
        }
      }
    };
  }

  // Subscribe to connection status changes
  onConnectionChange(listener: (connected: boolean) => void): () => void {
    this.connectionListeners.push(listener);

    // Return unsubscribe function
    return () => {
      const index = this.connectionListeners.indexOf(listener);
      if (index > -1) {
        this.connectionListeners.splice(index, 1);
      }
    };
  }

  // Send a message through WebSocket
  send(message: WebSocketMessage): boolean {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(message));
        return true;
      } catch (error) {
        if (this.enableDebugLogs) console.error('WebSocket: Error sending message:', error);
        return false;
      }
    }
    if (this.enableDebugLogs) console.warn('WebSocket: Cannot send message, connection not open');
    return false;
  }

  // Join a conversation room
  joinConversation(conversationId: string): boolean {
    return this.send({
      type: 'conversation_updated',
      data: { action: 'join', conversationId },
      conversationId
    });
  }

  // Leave a conversation room
  leaveConversation(conversationId: string): boolean {
    return this.send({
      type: 'conversation_updated',
      data: { action: 'leave', conversationId },
      conversationId
    });
  }

  // Send typing indicator
  sendTyping(conversationId: string, isTyping: boolean): boolean {
    return this.send({
      type: 'typing',
      data: { isTyping, userId: this.userId },
      conversationId
    });
  }

  // Get connection status
  isConnected(): boolean {
    return this.ws ? this.ws.readyState === WebSocket.OPEN : false;
  }
  
  // Get detailed connection info for debugging
  getConnectionInfo(): { status: string; readyState: number | null; url: string | null; attempts: number } {
    const readyStateMap = {
      0: 'CONNECTING',
      1: 'OPEN', 
      2: 'CLOSING',
      3: 'CLOSED'
    };
    
    return {
      status: this.ws ? readyStateMap[this.ws.readyState] || 'UNKNOWN' : 'NOT_INITIALIZED',
      readyState: this.ws?.readyState || null,
      url: this.ws?.url || null,
      attempts: this.reconnectAttempts
    };
  }
  
  // Force reconnect with reset attempt counter
  forceReconnect(): void {
    this.reconnectAttempts = 0;
    this.disconnect();
    setTimeout(() => this.connect(), 1000);
  }

  // Get connection state
  getConnectionState(): number | null {
    return this.ws ? this.ws.readyState : null;
  }

  // Enable or disable debug logging
  setDebugLogs(enabled: boolean): void {
    this.enableDebugLogs = enabled;
  }

  // Check if debug logs are enabled
  isDebugLogsEnabled(): boolean {
    return this.enableDebugLogs;
  }
}

export default new WebSocketService();
