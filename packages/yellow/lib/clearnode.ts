import { CLEARNODE_WS } from '@repo/web3';
import type { ClearNodeConnection, ClearNodeResponse } from './types.js';
import type { MessageSigner } from '@repo/web3';

/**
 * Pending request tracking
 */
interface PendingRequest {
  resolve: (value: ClearNodeResponse) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
}

/**
 * ClearNode WebSocket client
 */
class ClearNodeClientImpl {
  private connection: ClearNodeConnection = {
    ws: null,
    status: 'disconnected',
    signer: null,
  };

  private pendingRequests: Map<string, PendingRequest> = new Map();
  private messageHandlers: Map<string, (response: ClearNodeResponse) => void> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private requestTimeout = 30000;

  /**
   * Connect to ClearNode WebSocket
   */
  connect = async (signer: MessageSigner): Promise<void> =>
    new Promise((resolve, reject) => {
      if (this.connection.status === 'connected') {
        resolve();
        return;
      }

      this.connection.status = 'connecting';
      this.connection.signer = signer;

      const ws = new WebSocket(CLEARNODE_WS);

      ws.onopen = () => {
        this.connection.ws = ws;
        this.connection.status = 'connected';
        this.reconnectAttempts = 0;
        resolve();
      };

      ws.onclose = () => {
        this.connection.status = 'disconnected';
        this.handleDisconnect();
      };

      ws.onerror = () => {
        this.connection.status = 'error';
        this.connection.lastError = 'WebSocket connection error';
        reject(new Error('Failed to connect to ClearNode'));
      };

      ws.onmessage = event => {
        this.handleMessage(event.data as string);
      };
    });

  /**
   * Disconnect from ClearNode
   */
  disconnect = (): void => {
    if (this.connection.ws) {
      this.connection.ws.close();
      this.connection.ws = null;
    }
    this.connection.status = 'disconnected';
    this.pendingRequests.forEach(req => {
      clearTimeout(req.timeout);
      req.reject(new Error('Connection closed'));
    });
    this.pendingRequests.clear();
  };

  /**
   * Send a message and wait for response
   */
  sendAndWait = async <T extends ClearNodeResponse>(message: unknown, requestId?: string): Promise<T> => {
    if (this.connection.status !== 'connected' || !this.connection.ws) {
      throw new Error('Not connected to ClearNode');
    }

    const id = requestId || this.generateRequestId();
    const messageWithId = { ...(message as object), id };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error('Request timeout'));
      }, this.requestTimeout);

      this.pendingRequests.set(id, {
        resolve: resolve as (value: ClearNodeResponse) => void,
        reject,
        timeout,
      });

      this.connection.ws!.send(JSON.stringify(messageWithId));
    });
  };

  /**
   * Register a message handler for a specific message type
   */
  onMessage = (type: string, handler: (response: ClearNodeResponse) => void): (() => void) => {
    this.messageHandlers.set(type, handler);
    return () => this.messageHandlers.delete(type);
  };

  /**
   * Get current connection status
   */
  getStatus = (): ClearNodeConnection['status'] => this.connection.status;

  /**
   * Get the message signer
   */
  getSigner = (): MessageSigner | null => this.connection.signer;

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage = (data: string): void => {
    try {
      const response = JSON.parse(data) as ClearNodeResponse;

      // Handle pong messages
      if (response.type === 'pong') {
        return;
      }

      // Check if this is a response to a pending request
      if (response.id && this.pendingRequests.has(response.id)) {
        const pending = this.pendingRequests.get(response.id)!;
        clearTimeout(pending.timeout);
        this.pendingRequests.delete(response.id);

        if (response.error) {
          pending.reject(new Error(response.error));
        } else {
          pending.resolve(response);
        }
        return;
      }

      // Handle by message type
      const handler = this.messageHandlers.get(response.type);
      if (handler) {
        handler(response);
      }
    } catch {
      // Failed to parse message
    }
  };

  /**
   * Handle disconnection with reconnect logic
   */
  private handleDisconnect = (): void => {
    if (this.reconnectAttempts < this.maxReconnectAttempts && this.connection.signer) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

      setTimeout(() => {
        if (this.connection.signer) {
          this.connect(this.connection.signer).catch(() => {
            // Reconnect failed, will retry
          });
        }
      }, delay);
    }
  };

  /**
   * Generate a unique request ID
   */
  private generateRequestId = (): string => `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

  /**
   * Send a ping to keep connection alive
   */
  ping = (): void => {
    if (this.connection.ws && this.connection.status === 'connected') {
      this.connection.ws.send(JSON.stringify({ type: 'ping' }));
    }
  };
}

/**
 * Singleton client for shared use
 */
let sharedClient: ClearNodeClientImpl | null = null;

/**
 * Create a new ClearNode client instance
 */
const createClearNodeClient = (): ClearNodeClientImpl => new ClearNodeClientImpl();

/**
 * Get or create the shared ClearNode client
 */
const getSharedClearNodeClient = (): ClearNodeClientImpl => {
  if (!sharedClient) {
    sharedClient = createClearNodeClient();
  }
  return sharedClient;
};

// Export the class as a type and the factory functions
export type ClearNodeClient = ClearNodeClientImpl;
export { createClearNodeClient, getSharedClearNodeClient };
