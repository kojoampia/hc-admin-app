// e2e-fixture: read-only
// Issues GETs and reads response HEADERS. It renders nothing and writes nothing.

/**
 * The two things this stack can judge that nothing else in the repository can.
 *
 * <p>Every other spec in this folder drives a screen, and a screen is mostly the same under
 * `ng serve` as it is behind nginx. These two are not properties of the console at all — they are
 * properties of **the image the console ships in** and of **the hop between the browser and the
 * api** — so a unit test cannot reach them, a production build cannot reach them, and `ng serve`
 * serves something else entirely. They were uncovered on the day the gate was written, and both cost
 * one `cy.request` each.
 *
 * <p><b>Caching.</b> `web-nginx.conf` carries two rules that look interchangeable and are not: a
 * hashed bundle is `immutable` for a year, and anything named by hand — `favicon.ico`,
 * `manifest.webapp`, `content/css/loading.css`, every icon — must revalidate. That distinction is
 * not decoration. The rule was once a single extension list under a comment claiming it matched
 * hashed filenames, and it served the entire `content/` tree `immutable` for a year; hc-patient hit
 * the same bug on its 2026-08-12 brand rollout, with a browser still parsing a `loading.css` the
 * server had already replaced. Nothing fails when that regresses. Nothing appears in a deploy log.
 * The only way to see it is to ask the running image for a header.
 *
 * <p>The hash shape is the part that makes this worth asserting rather than reading: this project
 * builds through custom-esbuild and emits `chunk-2AAEXZMI.js` — uppercase base-32 after a HYPHEN —
 * where hc-patient's webpack build emits `main.a1b2c3d4.js`. Copying that repo's `\.[0-9a-f]{8,}\.`
 * pattern here matches zero of ~200 hashed files, and the failure is silent and backwards: every
 * bundle quietly drops to the one-hour rule while still serving correctly.
 *
 * <p><b>Pagination headers.</b> `PaginationIT` in the api already sweeps every list endpoint for
 * `X-Total-Count` and `Link`, so the api is not what is under test here — **the path is.** These
 * headers cross the gateway and then nginx before a browser sees them, and a header is the easiest
 * thing in an HTTP chain to drop: a `proxy_hide_header`, a filter that rebuilds the response, a
 * `Link` rewritten for the wrong scheme. That last one has actually reached production in this
 * stack. `app/shared/pagination/` cannot page a list whose total it never receives, and the symptom
 * is a screen showing its first 20 rows and no pager — which reads as a short collection.
 */

/** Where the console's entity calls go. Same prefix `ApplicationConfigService` builds. */
const ADMIN_API = '/services/hcadminservice/api';

/**
 * The `Cache-Control` directives on a URL, lower-cased and split.
 *
 * <p><b>This image sends `Cache-Control` TWICE on every static asset, and that is a real finding
 * this spec made on its first run.</b> Each static `location` in `web-nginx.conf` carries both
 * `expires 1y;` and `add_header Cache-Control "…"`, and nginx emits a field line for each — so a
 * hashed bundle really arrives as:
 *
 * <pre>
 *   Cache-Control: max-age=31536000
 *   Cache-Control: public, max-age=31536000, immutable
 * </pre>
 *
 * <p>It is not currently a bug: RFC 9111 has a recipient combine repeated field lines with commas,
 * the two `max-age` values agree, and `immutable` is present either way. It is a **latent** one,
 * because the two are maintained separately and nothing makes them agree — change `expires` without
 * changing `add_header` and the response carries two different `max-age` values, at which point the
 * behaviour is whichever the intermediary picked. Filed as backlog item 34(d) rather than fixed
 * here: dropping `expires` also drops the `Expires` header, which is a change to what the image
 * serves and wants its own decision.
 *
 * <p>So these cases assert **directives**, not the whole string. An equality assertion here would
 * have to encode the duplication, which would then pass only while the duplication existed — a test
 * pinned to the defect it found.
 */
const cacheDirectives = (url: string): Cypress.Chainable<string[]> =>
  cy.request<unknown>({ url }).then(response => {
    const raw = response.headers['cache-control'];
    return (Array.isArray(raw) ? raw : [String(raw)]).flatMap(value => value.split(',').map(directive => directive.trim().toLowerCase()));
  });

describe('the shipped edge', () => {
  describe('cache headers, which exist only in the image', () => {
    /**
     * Under `ng serve` these rules are not merely different, they are absent — the dev server is not
     * nginx and has no `web-nginx.conf`. Rather than assert something no dev server could satisfy,
     * or weaken the assertion until both could pass it, this reports **pending** when it is not
     * talking to the image. That is the same choice `responsive.cy.ts` makes about the defect it
     * cannot fix: a visible hole beats a silent one, and a green run here would be a claim about a
     * configuration that was not in the request path.
     */
    beforeEach(function () {
      cy.request('/index.html').then(response => {
        const server = String(response.headers.server ?? '');
        if (!/nginx/i.test(server)) {
          cy.log(`served by "${server || 'an unnamed server'}", not the shipped nginx image — skipping`);
          this.skip();
        }
      });
    });

    it('should serve a hashed bundle immutable for a year', () => {
      // The bundle is discovered from index.html, never named here. Its hash changes on every build,
      // so a literal would be wrong by the next commit — and would fail in a way that looks like a
      // caching defect rather than like a stale test.
      cy.request('/index.html').then(index => {
        const html = index.body as string;
        const hashed = /(?:src|href)="([^"]*-[A-Z0-9]{8,}\.(?:js|css))"/.exec(html);
        expect(hashed, 'index.html references at least one hashed bundle').to.not.equal(null);

        cacheDirectives(`/${hashed![1].replace(/^\//, '')}`).then(directives => {
          expect(directives, 'a hashed bundle is immutable').to.include('immutable');
          expect(directives, 'for a year').to.include('max-age=31536000');
          // The duplication described above is tolerable only while the copies agree. If `expires`
          // and `add_header` ever disagree this is what says so, rather than a browser somewhere
          // quietly choosing one.
          const maxAges = new Set(directives.filter(d => d.startsWith('max-age=')));
          expect([...maxAges], 'every Cache-Control field line agrees about max-age').to.have.length(1);
        });
      });
    });

    it('should make hand-named assets revalidate rather than freeze them for a year', () => {
      // favicon.ico is the exact file the broken rule used to freeze, and `branding.spec.ts`
      // guarantees it exists and is a real ICO.
      cacheDirectives('/favicon.ico').then(directives => {
        expect(directives, 'a hand-named asset must revalidate').to.include('must-revalidate');
        expect(directives, 'and must never be immutable — this is the icon incident').to.not.include('immutable');
        expect(directives, 'an hour, not a year').to.include('max-age=3600');
      });
    });

    it('should never cache index.html, or a deploy strands browsers on the previous build', () => {
      cacheDirectives('/index.html').then(directives => {
        expect(directives).to.include('no-store');
      });
    });

    it('should serve the manifest as a manifest and not as octet-stream', () => {
      // `.webapp` is in no mime.types anywhere, so this inherited the `default_type` until an
      // exact-match location was added for it. Browsers parse it either way, which is why nothing
      // was visibly wrong and why only a header assertion can see it.
      cy.request('/manifest.webapp').then(({ headers }) => {
        expect(String(headers['content-type'])).to.contain('application/manifest+json');
      });
      cacheDirectives('/manifest.webapp').then(directives => {
        expect(directives).to.include('must-revalidate');
      });
    });
  });

  describe('pagination headers, all the way through to the browser', () => {
    beforeEach(() => {
      cy.signInAs('ops');
    });

    it('should deliver X-Total-Count and Link across the gateway and nginx', () => {
      cy.window({ log: false }).then(win => {
        const key = Cypress.expose('jwtStorageName');
        const raw = win.sessionStorage.getItem(key) ?? win.localStorage.getItem(key);
        cy.request<unknown[]>({
          url: `${ADMIN_API}/messages?page=0&size=5`,
          headers: { Authorization: `Bearer ${JSON.parse(raw!) as string}` },
        }).then(response => {
          const total = Number(response.headers['x-total-count']);
          expect(total, 'X-Total-Count survived the gateway and nginx').to.be.greaterThan(0);

          // The relationship, not a literal: a page of 5 out of a collection larger than 5 is what
          // makes the `Link` header have anywhere to point. Asserting `43` would be a copy of the
          // fixture, which is what this whole folder exists to stop.
          expect(response.body.length, 'the page is capped at what was asked for').to.equal(5);
          expect(total, 'and there is more behind it, so the pager has work to do').to.be.greaterThan(response.body.length);

          const link = String(response.headers.link);
          expect(link, 'a Link header reached the browser').to.contain('rel="last"');
          expect(link, 'and it addresses the path the console actually calls').to.contain(`${ADMIN_API}/messages`);
        });
      });
    });
  });
});
