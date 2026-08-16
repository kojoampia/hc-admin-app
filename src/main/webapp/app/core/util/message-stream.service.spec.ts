import { afterEach, beforeEach, describe, expect, it, vitest } from 'vitest';
import { TestBed } from '@angular/core/testing';

import { AUTHENTICATION_TOKEN_KEY } from 'app/shared/jhipster/constants';
import { MessageStreamService } from './message-stream.service';

/** A body that yields the given chunks, as `fetch` would. */
function streamOf(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      chunks.forEach(chunk => controller.enqueue(encoder.encode(chunk)));
      controller.close();
    },
  });
}

const EVENT = (id: string, subject = 'Invoice query'): string =>
  JSON.stringify({ eventType: 'messageSentEvent', id, subject, fromAddress: 'a@b.gh', toAddress: 'desk@abofonsa.care' });

describe('MessageStreamService', () => {
  let service: MessageStreamService;

  beforeEach(() => {
    sessionStorage.setItem(AUTHENTICATION_TOKEN_KEY, JSON.stringify('a-token'));
    TestBed.configureTestingModule({});
    service = TestBed.inject(MessageStreamService);
  });

  /**
   * Put the storage back, because it is shared with every other spec in the run.
   *
   * Without this the token written above outlives the file, and auth-jwt.service.spec's "should
   * return empty token if not found in local storage nor session storage" reads `a-token` and
   * fails. It passed locally and failed in CI purely on file order, which is the worst kind of
   * flake: the suite is green until somebody adds a file.
   */
  afterEach(() => {
    sessionStorage.removeItem(AUTHENTICATION_TOKEN_KEY);
    localStorage.removeItem(AUTHENTICATION_TOKEN_KEY);
    vitest.unstubAllGlobals();
    service.stop();
  });

  const connect = (chunks: string[]): void => {
    vitest.stubGlobal(
      'fetch',
      vitest.fn(() => Promise.resolve(new Response(streamOf(chunks), { status: 200 }))),
    );
    service.start();
  };

  const settle = (): Promise<void> => new Promise(resolve => setTimeout(resolve, 0));

  it('should collect a sent event from the stream', async () => {
    connect([`data:${EVENT('m1')}\n\n`]);
    await settle();

    expect(service.notifications()).toHaveLength(1);
    expect(service.notifications()[0].subject).toBe('Invoice query');
  });

  /**
   * A frame can straddle a chunk boundary — the server writes one event, the network delivers it in
   * two reads. Parsing per chunk instead of buffering to the blank line drops or corrupts exactly
   * the events that split, which is invisible until the stream is busy.
   */
  it('should reassemble an event split across chunks', async () => {
    const event = EVENT('m2', 'Split across reads');
    connect([`data:${event.slice(0, 20)}`, `${event.slice(20)}\n\n`]);
    await settle();

    expect(service.notifications()).toHaveLength(1);
    expect(service.notifications()[0].subject).toBe('Split across reads');
  });

  /**
   * The same topic carries the audit trail and whatever else is published to it. Only sent messages
   * are notifications; anything else must be ignored rather than shown as an empty row.
   */
  it('should ignore anything that is not a sent event', async () => {
    connect([`data:{"type":"Security","message":"an audit row"}\n\n`, `data:not json at all\n\n`, `: a comment frame\n\n`]);
    await settle();

    expect(service.notifications()).toEqual([]);
  });

  it('should not show the same event twice', async () => {
    connect([`data:${EVENT('m3')}\n\n`, `data:${EVENT('m3')}\n\n`]);
    await settle();

    expect(service.notifications()).toHaveLength(1);
  });

  it('should drop a notification once it has been opened', async () => {
    connect([`data:${EVENT('m4')}\n\n`]);
    await settle();
    expect(service.notifications()).toHaveLength(1);

    service.dismiss('m4');

    expect(service.notifications()).toEqual([]);
  });

  /** Without a token there is nothing to authenticate with, so it must not call at all. */
  it('should not connect when signed out', () => {
    sessionStorage.removeItem(AUTHENTICATION_TOKEN_KEY);
    localStorage.removeItem(AUTHENTICATION_TOKEN_KEY);
    const fetchMock = vitest.fn();
    vitest.stubGlobal('fetch', fetchMock);

    service.start();

    expect(fetchMock).not.toHaveBeenCalled();
  });

  /**
   * `getEndpointFor` returns a path with no leading slash, which `fetch` resolves against the
   * current page rather than the base href. From `/message-desk/<id>` that asked for
   * `/message-desk/services/...`, the SPA fallback answered 200 with index.html, and the stream
   * silently produced HTML — no error, and no request the server ever saw.
   */
  it('should request an absolute path regardless of the current route', async () => {
    const fetchMock = vitest.fn((_url: string, _init?: RequestInit) => Promise.resolve(new Response(streamOf([]), { status: 200 })));
    vitest.stubGlobal('fetch', fetchMock);

    service.start();
    await settle();

    const requested = fetchMock.mock.calls[0][0];
    expect(new URL(requested).pathname).toBe('/services/hcadminservice/api/hc-admin-service-kafka/register');
  });

  it('should send the token as a header, never in the query string', async () => {
    const fetchMock = vitest.fn((_url: string, _init?: RequestInit) => Promise.resolve(new Response(streamOf([]), { status: 200 })));
    vitest.stubGlobal('fetch', fetchMock);

    service.start();
    await settle();

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).not.toContain('a-token');
    expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer a-token');
  });
});
