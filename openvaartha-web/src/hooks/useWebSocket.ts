import { useEffect, useRef } from 'react';
import { API_BASE } from '@/lib/api';

type WSEventCallback = (data: unknown) => void;

class WebSocketService {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: number | null = null;
  private listeners: Map<string, Set<WSEventCallback>> = new Map();

  constructor(url: string) {
    this.url = url;
  }

  public connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      // If we are reconnecting, emit a RECONNECTED event so listeners can refetch missed data
      if (this.reconnectAttempts > 0) {
        if (this.listeners.has('RECONNECTED')) {
          this.listeners.get('RECONNECTED')!.forEach(callback => callback({}));
        }
      }
      this.reconnectAttempts = 0;
    };

    this.ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        const { type, data } = payload;
        
        if (type && this.listeners.has(type)) {
          this.listeners.get(type)!.forEach(callback => callback(data));
        }
      } catch (error) {
        console.error('WebSocket message parsing error:', error);
      }
    };

    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      this.ws = null;
      this.scheduleReconnect();
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.ws?.close();
    };
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('WebSocket max reconnect attempts reached');
      return;
    }

    const timeout = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);
    this.reconnectAttempts++;
    
    console.log(`Scheduling WebSocket reconnect in ${timeout}ms...`);
    
    if (this.reconnectTimeout) {
      window.clearTimeout(this.reconnectTimeout);
    }
    
    this.reconnectTimeout = window.setTimeout(() => {
      this.connect();
    }, timeout);
  }

  public subscribe(eventType: string, callback: WSEventCallback) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(callback);
    
    return () => this.unsubscribe(eventType, callback);
  }

  public unsubscribe(eventType: string, callback: WSEventCallback) {
    if (this.listeners.has(eventType)) {
      this.listeners.get(eventType)!.delete(callback);
    }
  }

  public disconnect() {
    if (this.reconnectTimeout) {
      window.clearTimeout(this.reconnectTimeout);
    }
    this.ws?.close();
  }
}

// Global instance to share connection across components
const wsUrl = API_BASE.replace(/^http/, 'ws') + '/ws';
const wsService = new WebSocketService(wsUrl);
// Immediately try to connect on import (app load)
wsService.connect();

export function useWebSocket(eventType: string, callback: WSEventCallback) {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    const handler = (data: unknown) => savedCallback.current(data);
    const unsubscribe = wsService.subscribe(eventType, handler);
    
    return () => {
      unsubscribe();
    };
  }, [eventType]);
}
