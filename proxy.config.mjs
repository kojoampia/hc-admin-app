/**
 * Dev-server proxy to hc-admin-gateway.
 *
 * Every `/api/**`, `/management/**` and `/services/**` request the console makes goes through here.
 * There is no alternative path: the in-browser mock that used to answer them was removed in #11.
 *
 * The generated config proxied `^/(api|management|v3/api-docs)` to 127.0.0.1:8080. Both the pattern
 * and the port are wrong for this stack — see the note on `services` below.
 *
 * @type {import('vite').CommonServerOptions['proxy']}
 */
const gatewayHost = process.env.ABF_GATEWAY_HOST ?? '127.0.0.1';
const gatewayPort = process.env.ABF_GATEWAY_PORT ?? 5504;

export default {
  // The SSE stream, which must not be given a timeout.
  //
  // ⚠ Known limitation: a browser `fetch` of this path does not stream THROUGH THIS PROXY. curl
  // through it receives events fine and the same fetch against the real origin
  // (http://admin.healthconnect.local, i.e. nginx in front of the web container) receives them
  // fine — so the console's notifications work when served normally and are silently dead under
  // `ng serve`. If you are testing notifications, test them against the quality stack, not here.
  //
  // The rule below sets 5s so a dead gateway fails fast instead of looking like slowness. That is
  // right for a request/response call and fatal to a stream: the console's notification connection
  // is meant to stay open for half an hour, so a 5s proxy timeout severed it on a loop — the api
  // logged a fresh "Registering sse client" every five seconds and no event ever survived long
  // enough to be delivered. Declared first, because the pattern below would otherwise match it.
  '^/services/[^/]+/api/hc-admin-service-kafka/(register|unregister)': {
    target: `http://${gatewayHost}:${gatewayPort}`,
    xfwd: true,
    timeout: 0,
    proxyTimeout: 0,
  },
  // A proxy rather than a direct cross-origin call on purpose: the
  // gateway would otherwise have to CORS-allow the dev server, and a
  // same-origin path also keeps the JWT on the same site.
  //
  // `services` is in the pattern and is not optional. Entity requests are built as
  // `services/hcadminservice/api/<entity>`, because that is the path the gateway's discovery
  // locator publishes; `api/<entity>` reaches the gateway's own surface and 404s.
  //
  // Leaving it out does not produce a 404 here, which is what makes it worth stating: an unproxied
  // path falls through to the dev server's SPA fallback, which answers **200 with index.html**.
  // HttpClient then fails parsing HTML as JSON, and the screen reports a parse error rather than a
  // routing one. Production nginx already proxies /services/ — see web-nginx.conf in hc-admin-ci —
  // so this gap existed only in development.
  '^/(api|management|services)/': {
    target: `http://${gatewayHost}:${gatewayPort}`,
    xfwd: true,
    // A dead gateway should fail fast and visibly, not hang the request until
    // something times out and looks like slowness.
    timeout: 5000,
    proxyTimeout: 5000,
  },
};
