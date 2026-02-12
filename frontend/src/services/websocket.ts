/**
 * WebSocket client — authenticated real-time event stream from API.
 * JWT auth via query param, heartbeat ping/pong, exponential backoff reconnect.
 */

import type { WSEvent, EventType, ConnectionStatus } from "@/types";

type EventHandler = (data: Record<string, unknown>) => void;
type StatusHandler = (status: ConnectionStatus) => void;

class WebSocketClient {
  private ws: WebSocket | null = null;
  private handlers: Map<EventType, Set<EventHandler>> = new Map();
  private statusHandlers: Set<StatusHandler> = new Set();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectDelay = 1000;
  private maxReconnectDelay = 30000;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private _status: ConnectionStatus = "disconnected";
  private _explicitUrl: string | undefined;

  connect(url?: string) {
    const token = localStorage.getItem("nps_token");
    if (!token) {
      this.setStatus("error");
      return;
    }

    const wsUrl =
      url || `ws://${window.location.host}/ws/oracle?token=${token}`;
    this._explicitUrl = url;
    this.setStatus("connecting");
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      this.setStatus("connected");
      this.reconnectDelay = 1000;
      this.startHeartbeat();
    };

    this.ws.onmessage = (event) => {
      // Handle server ping
      if (event.data === "ping") {
        this.ws?.send("pong");
        return;
      }
      // Parse and dispatch event
      try {
        const msg: WSEvent = JSON.parse(event.data);
        const handlers = this.handlers.get(msg.event as EventType);
        if (handlers) {
          handlers.forEach((handler) => handler(msg.data));
        }
      } catch {
        // ignore parse errors
      }
    };

    this.ws.onclose = (event) => {
      this.stopHeartbeat();
      if (event.code === 4001) {
        this.setStatus("error"); // Auth failure — don't reconnect
        return;
      }
      this.setStatus("disconnected");
      this.scheduleReconnect();
    };

    this.ws.onerror = () => {
      this.ws?.close();
    };
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send("pong"); // Client-side keep-alive
      }
    }, 25000);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private setStatus(s: ConnectionStatus) {
    this._status = s;
    this.statusHandlers.forEach((handler) => handler(s));
  }

  get status(): ConnectionStatus {
    return this._status;
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.reconnectDelay = Math.min(
        this.reconnectDelay * 2,
        this.maxReconnectDelay,
      );
      this.connect(this._explicitUrl);
    }, this.reconnectDelay);
  }

  onStatus(handler: StatusHandler): () => void {
    this.statusHandlers.add(handler);
    return () => this.statusHandlers.delete(handler);
  }

  on(event: EventType, handler: EventHandler): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);
    return () => this.off(event, handler);
  }

  off(event: EventType, handler: EventHandler) {
    this.handlers.get(event)?.delete(handler);
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.stopHeartbeat();
    this.ws?.close();
    this.ws = null;
    this.setStatus("disconnected");
  }
}

export const wsClient = new WebSocketClient();
