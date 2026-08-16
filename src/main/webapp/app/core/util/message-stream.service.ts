import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';

import { ApplicationConfigService } from 'app/core/config/application-config.service';
import { ADMIN_SERVICE } from 'app/config/microservice.constants';
import { AUTHENTICATION_TOKEN_KEY } from 'app/shared/jhipster/constants';

/** What the api publishes when a message is sent. Metadata only — never the body. */
export interface MessageSentEvent {
  eventType: string;
  id: string;
  subject?: string | null;
  fromAddress?: string | null;
  senderName?: string | null;
  toAddress?: string | null;
  recipientName?: string | null;
  sentAt?: string | null;
  channel?: string | null;
  priority?: string | null;
  parentId?: string | null;
}

const SENT_EVENT = 'messageSentEvent';

/**
 * Live notifications, over the Kafka bridge's SSE endpoint.
 *
 * <p>Read with `fetch` rather than `EventSource`, and that is not a preference. `EventSource` cannot
 * set an `Authorization` header, and the alternative — putting a 24-hour admin token in the query
 * string — writes it into every access log between here and the service.
 *
 * <p>The stream carries metadata only. Opening a notification fetches the message itself,
 * authenticated, from the service that owns it; the body never travels on the bus, because a Kafka
 * topic is retained, replicated, and readable by every service on it.
 *
 * <p>There is deliberately no `/websocket` here. The console had a SockJS client pointed at one for
 * a long time and no backend ever implemented it — the widget above it reported "connected"
 * regardless. SSE is the transport that exists and works.
 */
@Injectable({ providedIn: 'root' })
export class MessageStreamService {
  private readonly received = signal<MessageSentEvent[]>([]);
  private readonly connected = signal(false);

  // eslint-disable-next-line @typescript-eslint/member-ordering
  readonly notifications = this.received.asReadonly();
  // eslint-disable-next-line @typescript-eslint/member-ordering
  readonly isConnected = this.connected.asReadonly();
  // eslint-disable-next-line @typescript-eslint/member-ordering
  readonly unreadCount = computed(() => this.received().length);

  private readonly applicationConfigService = inject(ApplicationConfigService);
  private readonly destroyRef = inject(DestroyRef);

  private controller: AbortController | null = null;

  constructor() {
    this.destroyRef.onDestroy(() => this.stop());
  }

  /** Idempotent: a second call while connected is a no-op rather than a second stream. */
  start(): void {
    if (this.controller) {
      return;
    }
    const token = this.token();
    if (!token) {
      return;
    }
    const controller = new AbortController();
    this.controller = controller;
    void this.consume(this.streamUrl(), token, controller);
  }

  stop(): void {
    this.controller?.abort();
    this.controller = null;
    this.connected.set(false);
  }

  /** Dismiss one notification once it has been opened. */
  dismiss(id: string): void {
    this.received.update(events => events.filter(event => event.id !== id));
  }

  clear(): void {
    this.received.set([]);
  }

  /**
   * The stream URL, resolved absolutely.
   *
   * <p>`getEndpointFor` returns a path with no leading slash — `services/hcadminservice/...` — which
   * `HttpClient` resolves against the document's base href. `fetch` does not: it resolves against
   * the *current page*, so from `/message-desk/<id>` this asked for
   * `/message-desk/services/hcadminservice/...`, the SPA fallback answered **200 with index.html**,
   * and the stream silently produced HTML that parsed as nothing. No error, no request the server
   * ever saw, and a notification bell that stayed empty forever.
   */
  private streamUrl(): string {
    return new URL(
      this.applicationConfigService.getEndpointFor('api/hc-admin-service-kafka/register', ADMIN_SERVICE),
      document.baseURI,
    ).toString();
  }

  private async consume(url: string, token: string, controller: AbortController): Promise<void> {
    try {
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'text/event-stream' },
        signal: controller.signal,
      });
      if (!response.ok || !response.body) {
        this.connected.set(false);
        return;
      }
      this.connected.set(true);
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      for (;;) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        buffer += decoder.decode(value, { stream: true });
        // SSE frames are separated by a blank line, and a frame can arrive split across reads —
        // parsing per chunk instead would drop or corrupt every event that straddles a boundary.
        const frames = buffer.split('\n\n');
        buffer = frames.pop() ?? '';
        frames.forEach(frame => this.accept(frame));
      }
    } catch {
      // An aborted stream is a normal sign-out, and a dropped one is not worth an alert: the desk
      // still works without live notification, and the next start() reconnects.
    } finally {
      this.connected.set(false);
      if (this.controller === controller) {
        this.controller = null;
      }
    }
  }

  private accept(frame: string): void {
    const data = frame
      .split('\n')
      .filter(line => line.startsWith('data:'))
      .map(line => line.slice(5).trim())
      .join('');
    if (!data) {
      return;
    }
    try {
      const event = JSON.parse(data) as MessageSentEvent;
      // The same stream carries the audit trail and whatever else is published to the topic. Only
      // sent messages are notifications; everything else is somebody else's business.
      if (event.eventType === SENT_EVENT && event.id) {
        this.received.update(events => (events.some(seen => seen.id === event.id) ? events : [event, ...events].slice(0, 20)));
      }
    } catch {
      // Not JSON, or not ours. The stream is shared; ignoring what we do not recognise is the point.
    }
  }

  private token(): string | null {
    const raw = localStorage.getItem(AUTHENTICATION_TOKEN_KEY) ?? sessionStorage.getItem(AUTHENTICATION_TOKEN_KEY);
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as string;
    } catch {
      return raw;
    }
  }
}
