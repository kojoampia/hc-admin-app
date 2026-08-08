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
