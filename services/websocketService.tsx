import AsyncStorage from '@react-native-async-storage/async-storage';
import config from '../config';

export interface WebSocketMessage {
  type: 'connection' | 'conversation_started' | 'conversation_initiated' | 'new_message' | 'user_typing';
  data: any;
}

type WebSocketListener = (message: WebSocketMessage) => void;

class WebSocketService {
  private ws: WebSocket | null = null;
  private listeners: WebSocketListener[] = [];
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second
  private isConnecting = false;
  private enableDebugLogs = false;

  async connect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) {
      return;
    }

    try {
      this.isConnecting = true;
      const token = await AsyncStorage.getItem('@auth_token');
      
      if (!token) {
        if (this.enableDebugLogs) console.log('WebSocket: No token available for connection');
        this.isConnecting = false;
        return;
      }

      // Convert HTTP URL to WebSocket URL
      const wsUrl = config.apiUrl.replace('http:', 'ws:').replace('https:', 'wss:');
      const url = `${wsUrl}/api/parts/ws?token=${encodeURIComponent(token)}`;
      
      if (this.enableDebugLogs) console.log('WebSocket: Attempting to connect to:', url);

      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        if (this.enableDebugLogs) console.log('WebSocket: Connected successfully');
        this.reconnectAttempts = 0;
        this.reconnectDelay = 1000;
        this.isConnecting = false;
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          if (this.enableDebugLogs) console.log('WebSocket: Received message:', message);
          this.listeners.forEach(listener => listener(message));
        } catch (error) {
          if (this.enableDebugLogs) console.error('WebSocket: Error parsing message:', error);
        }
      };

      this.ws.onclose = (event) => {
        if (this.enableDebugLogs) console.log('WebSocket: Connection closed', event.code, event.reason);
        this.isConnecting = false;
        this.ws = null;
        
        // Attempt to reconnect if not a clean close
        if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = (error) => {
        if (this.enableDebugLogs) console.error('WebSocket: Connection error:', error);
        this.isConnecting = false;
      };

    } catch (error) {
      if (this.enableDebugLogs) console.error('WebSocket: Failed to create connection:', error);
      this.isConnecting = false;
    }
  }

  private scheduleReconnect(): void {
    this.reconnectAttempts++;
    const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), 30000);
    
    if (this.enableDebugLogs) console.log(`WebSocket: Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms`);
    
    setTimeout(() => {
      this.connect();
    }, delay);
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close(1000, 'User disconnected');
      this.ws = null;
    }
  }

  addListener(listener: WebSocketListener): () => void {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  sendMessage(message: any): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      if (this.enableDebugLogs) console.warn('WebSocket: Cannot send message, connection not open');
    }
  }

  joinConversation(conversationId: string): void {
    this.sendMessage({
      type: 'join_conversation',
      data: { conversationId }
    });
  }

  leaveConversation(conversationId: string): void {
    this.sendMessage({
      type: 'leave_conversation',
      data: { conversationId }
    });
  }

  sendTypingIndicator(conversationId: string, isTyping: boolean): void {
    this.sendMessage({
      type: 'user_typing',
      data: { conversationId, isTyping }
    });
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
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