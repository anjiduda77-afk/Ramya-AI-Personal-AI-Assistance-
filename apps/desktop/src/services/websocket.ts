/**
 * WebSocket manager for live voice sessions, transcription, and orb state synchronization.
 */

export type OrbState = 'idle' | 'listening' | 'processing' | 'speaking' | 'success' | 'error';

class WebSocketService {
  private ws: WebSocket | null = null;
  private listeners: ((msg: any) => void)[] = [];
  private orbStateListeners: ((state: OrbState) => void)[] = [];
  public currentOrbState: OrbState = 'idle';

  connect(url: string = 'ws://127.0.0.1:8000/ws/assistant') {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        console.log('[Ramya AI WS] Connected to assistant backend.');
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'state_sync' && msg.orbState) {
            this.setOrbState(msg.orbState as OrbState);
          }
          this.listeners.forEach((l) => l(msg));
        } catch (e) {
          console.error('[Ramya AI WS] Parse error:', e);
        }
      };

      this.ws.onclose = () => {
        console.log('[Ramya AI WS] Disconnected. Reconnecting in 3s...');
        setTimeout(() => this.connect(url), 3000);
      };

      this.ws.onerror = (err) => {
        console.warn('[Ramya AI WS] Connection issue:', err);
      };
    } catch (e) {
      console.error('[Ramya AI WS] Failed to initialize socket:', e);
    }
  }

  send(data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  setOrbState(state: OrbState) {
    this.currentOrbState = state;
    this.orbStateListeners.forEach((fn) => fn(state));
  }

  onMessage(listener: (msg: any) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  onOrbStateChange(listener: (state: OrbState) => void) {
    this.orbStateListeners.push(listener);
    listener(this.currentOrbState);
    return () => {
      this.orbStateListeners = this.orbStateListeners.filter((l) => l !== listener);
    };
  }

  cancel() {
    this.send({ type: 'cancel' });
    this.setOrbState('idle');
  }
}

export const wsService = new WebSocketService();
