import AsyncStorage from '@react-native-async-storage/async-storage';
import config from '../config';
import { Message } from './conversationService';

export interface RealtimeEvent {
  type: 'new_message' | 'message_read' | 'user_typing' | 'user_online' | 'user_offline' | 'connection';
  data: any;
}

class RealtimeService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private listeners: Map<string, ((event: RealtimeEvent) => void)[]> = new Map();
  private isConnecting = false;

  async connect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) {
      return;
    }

    this.isConnecting = true;
    
    try {
      const token = await AsyncStorage.getItem('@auth_token');
      if (!token) {
        throw new Error('No auth token available');
      }

      const wsUrl = config.apiUrl.replace(/^http/, 'ws') + `/ws?token=${token}`;
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0;
        this.isConnecting = false;
        this.emit('connection', { type: 'connection', data: { status: 'connected' } });
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.emit(data.type, data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        this.isConnecting = false;
        this.ws = null;
        
        // Attempt to reconnect if it wasn't a manual close
        if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.isConnecting = false;
      };

    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      this.isConnecting = false;
      throw error;
    }
  }

  private scheduleReconnect(): void {
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`Scheduling WebSocket reconnect attempt ${this.reconnectAttempts} in ${delay}ms`);
    
    setTimeout(() => {
      this.connect().catch(console.error);
    }, delay);
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close(1000, 'Manual disconnect');
      this.ws = null;
    }
    this.listeners.clear();
  }

  private emit(eventType: string, event: RealtimeEvent): void {
    const eventListeners = this.listeners.get(eventType);
    if (eventListeners) {
      eventListeners.forEach(callback => {
        try {
          callback(event);
        } catch (error) {
          console.error('Error in realtime event listener:', error);
        }
      });
    }
  }

  on(eventType: string, callback: (event: RealtimeEvent) => void): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    
    this.listeners.get(eventType)!.push(callback);

    // Return unsubscribe function
    return () => {
      const listeners = this.listeners.get(eventType);
      if (listeners) {
        const index = listeners.indexOf(callback);
        if (index > -1) {
          listeners.splice(index, 1);
        }
      }
    };
  }

  // Convenience methods for specific events
  onNewMessage(callback: (message: Message) => void): () => void {
    return this.on('new_message', (event) => {
      if (event.data?.message) {
        callback(event.data.message);
      }
    });
  }

  onMessageRead(callback: (data: { conversationId: string; userId: string }) => void): () => void {
    return this.on('message_read', (event) => {
      if (event.data?.conversationId && event.data?.userId) {
        callback(event.data);
      }
    });
  }

  onUserTyping(callback: (data: { conversationId: string; userId: string; isTyping: boolean }) => void): () => void {
    return this.on('user_typing', (event) => {
      if (event.data?.conversationId && event.data?.userId !== undefined) {
        callback(event.data);
      }
    });
  }

  // Send events to server
  sendTyping(conversationId: string, isTyping: boolean): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'user_typing',
        data: { conversationId, isTyping }
      }));
    }
  }

  joinConversation(conversationId: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'join_conversation',
        data: { conversationId }
      }));
    }
  }

  leaveConversation(conversationId: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'leave_conversation',
        data: { conversationId }
      }));
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

export default new RealtimeService();
