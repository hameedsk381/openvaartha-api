import { useEffect, useRef } from 'react';
import { API_BASE, getStoredToken } from '@/lib/api';

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
    if (!this.listeners.size || this.reconnectTimeout !== null) return;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const token = getStoredToken();
    const url = token ? `${this.url}?token=${encodeURIComponent(token)}` : this.url;
    const socket = new WebSocket(url);
    this.ws = socket;

    socket.onopen = () => {
      // If we are reconnecting, emit a RECONNECTED event so listeners can refetch missed data
      if (this.reconnectAttempts > 0) {
        if (this.listeners.has('RECONNECTED')) {
          this.listeners.get('RECONNECTED')!.forEach(callback => callback({}));
        }
      }
      this.reconnectAttempts = 0;
    };

    socket.onmessage = (event) => {
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

    socket.onclose = () => {
      if (this.ws !== socket) return;
      this.ws = null;
      this.scheduleReconnect();
    };
  }

  private scheduleReconnect() {
    if (!this.listeners.size || this.reconnectAttempts >= this.maxReconnectAttempts) return;

    const timeout = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);
    this.reconnectAttempts++;
    
    this.reconnectTimeout = window.setTimeout(() => {
      this.reconnectTimeout = null;
      this.connect();
    }, timeout);
  }

  public subscribe(eventType: string, callback: WSEventCallback) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(callback);
    this.connect();
    
    return () => this.unsubscribe(eventType, callback);
  }

  public unsubscribe(eventType: string, callback: WSEventCallback) {
    const callbacks = this.listeners.get(eventType);
    callbacks?.delete(callback);
    if (callbacks?.size === 0) this.listeners.delete(eventType);
    if (!this.listeners.size) this.disconnect();
  }

  private disconnect() {
    if (this.reconnectTimeout !== null) {
      window.clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    const socket = this.ws;
    this.ws = null;
    this.reconnectAttempts = 0;
    if (socket?.readyState === WebSocket.CONNECTING) {
      // Closing an in-flight handshake produces a browser error. Close after open instead.
      socket.onopen = () => socket.close();
      socket.onmessage = null;
    } else {
      socket?.close();
    }
  }
}

// Global instance to share connection across components
const wsUrl = API_BASE.replace(/^http/, 'ws') + '/ws';
const wsService = new WebSocketService(wsUrl);

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
