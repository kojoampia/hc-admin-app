/**
 * No dev-server proxy.
 *
 * This build has no backend. `/api/**` is answered inside the browser by
 * `app/core/mock/mock-api.interceptor.ts`, which resolves every request
 * before it reaches the network, so there is nothing to forward and nothing
 * listening if we did.
 *
 * The generated config proxied `^/(api|management|v3/api-docs)` to
 * 127.0.0.1:8080. Left in place it is actively harmful: any request the mock
 * router does not recognise would fall through to a dead port and hang the
 * dev server's proxy until it timed out, which reads as "the app is slow"
 * rather than "that endpoint is unmocked".
 *
 * To point the client at a real hc-admin-gateway, restore a rule here
 * targeting :5504 and delete `app/core/mock/` — see that folder's README.
 *
 * @type {import('vite').CommonServerOptions['proxy']}
 */
const gatewayHost = process.env.ABF_GATEWAY_HOST ?? '127.0.0.1';
const gatewayPort = process.env.ABF_GATEWAY_PORT ?? 5504;

export default {
  // Only reached in NETWORK mode. In mock mode the interceptor resolves these
  // paths inside the browser and nothing arrives here at all.
  //
  // It is a proxy rather than a direct cross-origin call on purpose: the
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
