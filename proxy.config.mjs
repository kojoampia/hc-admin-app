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
export default {};
