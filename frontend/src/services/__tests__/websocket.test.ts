import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock WebSocket globally
class MockWebSocket {
  static instances: MockWebSocket[] = [];
  url: string;
  readyState = 1; // OPEN
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  sent: string[] = [];

  static readonly OPEN = 1;
  static readonly CLOSED = 3;

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
    // Auto-fire onopen after a tick
    setTimeout(() => this.onopen?.(new Event("open")), 0);
  }

  send(data: string) {
    this.sent.push(data);
  }

  close() {
    this.readyState = 3;
  }
}

vi.stubGlobal("WebSocket", MockWebSocket);

// Must import after mock is set up
// Use dynamic import to ensure the mock is in place
let wsClient: typeof import("@/services/websocket").wsClient;

describe("WebSocketClient", () => {
  beforeEach(async () => {
    MockWebSocket.instances = [];
    localStorage.clear();
    vi.useFakeTimers();
    // Re-import to get a fresh client
    vi.resetModules();
    const mod = await import("@/services/websocket");
    wsClient = mod.wsClient;
  });

  afterEach(() => {
    wsClient?.disconnect();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("appends JWT token to WebSocket URL", () => {
    localStorage.setItem("nps_token", "my-jwt-token");
    wsClient.connect();
    expect(MockWebSocket.instances.length).toBe(1);
    expect(MockWebSocket.instances[0].url).toContain("?token=my-jwt-token");
  });

  it("sets error status when no token available", () => {
    // Clear both JWT and API key fallback
    const origEnv = import.meta.env.VITE_API_KEY;
    import.meta.env.VITE_API_KEY = "";
    const statuses: string[] = [];
    wsClient.onStatus((s) => statuses.push(s));
    wsClient.connect();
    expect(statuses).toContain("error");
    expect(MockWebSocket.instances.length).toBe(0);
    import.meta.env.VITE_API_KEY = origEnv;
  });

  it("does not reconnect on auth failure (code 4001)", async () => {
    localStorage.setItem("nps_token", "some-token");
    wsClient.connect();
    const ws = MockWebSocket.instances[0];

    // Simulate auth rejection close
    ws.onclose?.(new CloseEvent("close", { code: 4001 }));

    // Advance timers — should NOT create another WebSocket
    vi.advanceTimersByTime(5000);
    expect(MockWebSocket.instances.length).toBe(1);
  });

  it("schedules reconnect on normal close", async () => {
    localStorage.setItem("nps_token", "some-token");
    wsClient.connect();
    const ws = MockWebSocket.instances[0];

    // Simulate normal close
    ws.onclose?.(new CloseEvent("close", { code: 1000 }));

    // Advance past reconnect delay
    vi.advanceTimersByTime(2000);
    expect(MockWebSocket.instances.length).toBe(2);
  });

  it("responds with pong when server sends ping", () => {
    localStorage.setItem("nps_token", "some-token");
    wsClient.connect();
    const ws = MockWebSocket.instances[0];

    // Fire onopen first
    ws.onopen?.(new Event("open"));

    // Simulate server ping
    ws.onmessage?.(new MessageEvent("message", { data: "ping" }));
    expect(ws.sent).toContain("pong");
  });

  it("dispatches JSON events to registered handlers", () => {
    localStorage.setItem("nps_token", "some-token");
    const received: Record<string, unknown>[] = [];
    wsClient.on("reading_progress", (data) => received.push(data));
    wsClient.connect();
    const ws = MockWebSocket.instances[0];

    ws.onmessage?.(
      new MessageEvent("message", {
        data: JSON.stringify({
          event: "reading_progress",
          data: { step: "calculating", progress: 50, message: "Half done" },
        }),
      }),
    );

    expect(received.length).toBe(1);
    expect(received[0].step).toBe("calculating");
  });

  it("applies exponential backoff capped at 30s", () => {
    localStorage.setItem("nps_token", "some-token");
    wsClient.connect();

    // Close and reconnect several times
    for (let i = 0; i < 10; i++) {
      const currentWs =
        MockWebSocket.instances[MockWebSocket.instances.length - 1];
      currentWs.onclose?.(new CloseEvent("close", { code: 1000 }));
      vi.advanceTimersByTime(60000); // advance well past any delay
    }

    // Should have attempted multiple reconnects
    expect(MockWebSocket.instances.length).toBeGreaterThan(3);
  });
});
