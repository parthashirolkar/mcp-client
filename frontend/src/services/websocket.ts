import { WSMessage, ServerStatusUpdate, ToolInfo } from '../types/mcp';

export type WebSocketEventHandler = (data: any) => void;

class WebSocketService {
  private ws: WebSocket | null = null;
  private connectionId: string;
  private eventHandlers: Map<string, WebSocketEventHandler[]> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnecting = false;

  constructor(connectionId: string = 'default') {
    this.connectionId = connectionId;
    this.connect();
  }

  private connect(): void {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    this.isConnecting = true;
    const wsUrl = `${process.env.REACT_APP_WS_URL || 'ws://localhost:8000'}/ws/${this.connectionId}`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.isConnecting = false;
        this.reconnectAttempts = 0;

        // Resubscribe to all events after reconnection
        this.eventHandlers.forEach((_, eventType) => {
          this.subscribe(eventType);
        });
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WSMessage = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      this.ws.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        this.isConnecting = false;
        this.ws = null;

        // Attempt to reconnect if not a normal closure
        if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.attemptReconnect();
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.isConnecting = false;
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      this.isConnecting = false;
      this.attemptReconnect();
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);

    setTimeout(() => {
      this.connect();
    }, delay);
  }

  private handleMessage(message: WSMessage): void {
    const { type, data } = message;
    const handlers = this.eventHandlers.get(type);

    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in WebSocket event handler for ${type}:`, error);
        }
      });
    }

    // Always call the general message handler
    const generalHandlers = this.eventHandlers.get('*');
    if (generalHandlers) {
      generalHandlers.forEach(handler => {
        try {
          handler(message);
        } catch (error) {
          console.error('Error in general WebSocket event handler:', error);
        }
      });
    }
  }

  // Subscribe to specific server events
  subscribe(eventType: string, handler?: WebSocketEventHandler): void {
    // Add handler if provided
    if (handler) {
      if (!this.eventHandlers.has(eventType)) {
        this.eventHandlers.set(eventType, []);
      }
      this.eventHandlers.get(eventType)!.push(handler);
    }

    // Send subscription message to server
    this.send({
      type: 'subscribe',
      data: { event_type: eventType }
    });
  }

  // Unsubscribe from specific server events
  unsubscribe(eventType: string, handler?: WebSocketEventHandler): void {
    // Remove specific handler if provided
    if (handler && this.eventHandlers.has(eventType)) {
      const handlers = this.eventHandlers.get(eventType)!;
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }

      // Remove event type if no handlers left
      if (handlers.length === 0) {
        this.eventHandlers.delete(eventType);
      }
    } else if (!handler) {
      // Remove all handlers for this event type
      this.eventHandlers.delete(eventType);
    }

    // Send unsubscription message to server
    this.send({
      type: 'unsubscribe',
      data: { event_type: eventType }
    });
  }

  // Send a message to the server
  send(message: WSMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected, unable to send message:', message);
    }
  }

  // Request current status
  requestStatus(): void {
    this.send({
      type: 'get_status',
      data: {}
    });
  }

  // Request current tools
  requestTools(): void {
    this.send({
      type: 'get_tools',
      data: {}
    });
  }

  // Get connection state
  get readyState(): number {
    return this.ws?.readyState ?? WebSocket.CLOSED;
  }

  // Check if connected
  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  // Close the WebSocket connection
  disconnect(): void {
    if (this.ws) {
      this.ws.close(1000, 'Client disconnecting');
      this.ws = null;
    }
    this.eventHandlers.clear();
  }

  // Common event subscriptions
  onServerStatusUpdate(handler: (data: ServerStatusUpdate) => void): void {
    this.subscribe('server_status_update', handler);
  }

  onToolsUpdate(handler: (data: { servers: Record<number, ToolInfo[]> }) => void): void {
    this.subscribe('tools_update', handler);
  }

  onToolExecutionResult(handler: (data: { server_id: number; tool_name: string; result: any }) => void): void {
    this.subscribe('tool_execution_result', handler);
  }

  onStatusUpdate(handler: (data: { servers: any[] }) => void): void {
    this.subscribe('status_update', handler);
  }

  onError(handler: (data: { message: string }) => void): void {
    this.subscribe('error', handler);
  }
}

// Create a singleton instance
const websocketService = new WebSocketService(`client-${Date.now()}`);

export default websocketService;