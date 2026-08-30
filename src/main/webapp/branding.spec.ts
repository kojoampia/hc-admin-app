import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * The static branding surface: the icons, the manifest, the title and robots.txt.
 *
 * <p>None of this is reachable from a component test, and none of it fails a build. An icon left at
 * the webapp root, a manifest naming a file nobody generated, a `sizes="32x32"` on a 16px raster —
 * every one of those produces a page that renders perfectly and quietly has no icon. So these read
 * the files off disk and check them against each other.
 *
 * <p>Where a rule can be derived it is derived rather than listed. A test whose coverage has to be
 * extended by hand silently stops covering things — which is how eight unpaginated endpoints got
 * past a sweep that named twenty-three paths.
 */
describe('branding', () => {
  const WEBAPP = 'src/main/webapp';
  const IMAGES = `${WEBAPP}/content/images`;

  const read = (path: string): string => readFileSync(path, 'utf8');
  const indexHtml = read(`${WEBAPP}/index.html`);
  const manifest = JSON.parse(read(`${WEBAPP}/manifest.webapp`));

  /** Width and height out of a PNG's IHDR, so a size attribute can be checked against the pixels. */
  const pngSize = (path: string): { width: number; height: number } => {
    const head = readFileSync(path).subarray(0, 24);
    expect(head.subarray(0, 8)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    return { width: head.readUInt32BE(16), height: head.readUInt32BE(20) };
  };

  /** Every `href` in the document head, paired with its `sizes` where it declares one. */
  const links = [...indexHtml.matchAll(/<link\b[^>]*>/g)]
    .map(([tag]) => ({
      href: /href="([^"]+)"/.exec(tag)?.[1],
      sizes: /sizes="([^"]+)"/.exec(tag)?.[1],
    }))
    .flatMap(link => (link.href ? [{ href: link.href, sizes: link.sizes }] : []));

  describe('index.html', () => {
    /**
     * `angular.json` copies `content`, `favicon.ico`, `manifest.webapp`, `robots.txt` and
     * `swagger-ui` — nothing else. An icon added at the webapp root is never copied, so it 404s in
     * production and only in production. hc-patient shipped that mistake once and caught it in the
     * build; this is the check that would have caught it here.
     */
    it('links only files the build actually copies', () => {
      for (const { href } of links) {
        if (href.startsWith('http')) continue;
        expect(existsSync(`${WEBAPP}/${href}`), `${href} is linked but not on disk`).toBe(true);
        const copied = href === 'favicon.ico' || href === 'manifest.webapp' || href.startsWith('content/');
        expect(copied, `${href} is outside angular.json's assets and would 404 in a production build`).toBe(true);
      }
    });

    it('declares icon sizes that match the pixels', () => {
      const sized = links.filter(link => link.sizes && link.href.endsWith('.png'));
      expect(sized.length).toBeGreaterThan(0);
      for (const { href, sizes } of sized) {
        const { width, height } = pngSize(`${WEBAPP}/${href}`);
        expect(`${width}x${height}`, `${href} declares ${sizes}`).toBe(sizes);
      }
    });

    /**
     * quality/startup.sh reads this title to prove the container behind the hostname is this console
     * and not a sibling site on the same nginx — a 200 says something answered, not that it is ours.
     * It also has to agree with the title the router writes once Angular boots, or the tab changes
     * name on load.
     */
    it('carries the same title the running app sets', () => {
      const title = /<title>([^<]+)<\/title>/.exec(indexHtml)?.[1];
      const runtime = JSON.parse(read(`${WEBAPP}/i18n/en/global.json`)).global.title;
      expect(title).toBe(runtime);
    });

    it('has a real description rather than the generated placeholder', () => {
      const description = /<meta\s+name="description"[\s\S]*?content="([^"]+)"/.exec(indexHtml)?.[1];
      expect(description).toBeTruthy();
      expect(description).not.toMatch(/Description for/i);
    });

    it('tells robots not to index the console', () => {
      expect(indexHtml).toMatch(/<meta name="robots" content="noindex, nofollow" \/>/);
    });
  });

  describe('manifest.webapp', () => {
    it('names icons that exist at the sizes it claims', () => {
      expect(manifest.icons.length).toBeGreaterThan(0);
      for (const icon of manifest.icons) {
        const path = `${WEBAPP}/${icon.src.replace(/^\.\//, '')}`;
        expect(existsSync(path), `${icon.src} is in the manifest but not on disk`).toBe(true);
        const { width, height } = pngSize(path);
        expect(`${width}x${height}`, `${icon.src} declares ${icon.sizes}`).toBe(icon.sizes);
      }
    });

    /**
     * The tile is the brand navy, and so is the `theme-color` the browser paints its chrome with.
     * They are read from the token file rather than repeated here, so a palette change moves them
     * together or fails.
     */
    it('uses the brand navy, and index.html agrees', () => {
      const navy = /\$abf-navy:\s*(#[0-9a-f]{6})/i.exec(read(`${WEBAPP}/content/scss/_hc-tokens.scss`))?.[1];
      expect(navy).toBeTruthy();
      expect(manifest.theme_color).toBe(navy);
      expect(manifest.background_color).toBe(navy);
      expect(indexHtml).toContain(`<meta name="theme-color" content="${navy}" />`);
    });
  });

  /**
   * The generator claims every file it writes is wired to something. This is what makes that true
   * rather than aspirational — a size rendered and then forgotten shows up here, not in a review.
   */
  it('ships no icon that nothing references', () => {
    const referenced = `${indexHtml}\n${read(`${WEBAPP}/manifest.webapp`)}\n${read(`${WEBAPP}/content/css/loading.css`)}`;
    const orphans = readdirSync(IMAGES)
      .filter(name => name !== 'hc-logo.png') // the screen logo; navbar.html and login.html read it
      .filter(name => !referenced.includes(name));
    expect(orphans).toEqual([]);
  });

  /**
   * A PNG wearing an .ico extension is what was here before. Browsers tolerate it for
   * `rel="icon"`, but it carries a single raster where a favicon wants 16, 32 and 48, and Windows
   * will not read it at all. The magic number is `00 00 01 00`.
   */
  it('ships a real multi-resolution favicon.ico', () => {
    const ico = readFileSync(`${WEBAPP}/favicon.ico`);
    expect(ico.subarray(0, 4)).toEqual(Buffer.from([0x00, 0x00, 0x01, 0x00]));
    expect(ico.readUInt16LE(4)).toBe(3);
  });

  it('disallows every crawler', () => {
    const robots = read(`${WEBAPP}/robots.txt`);
    expect(robots).toMatch(/^User-agent: \*$/m);
    expect(robots).toMatch(/^Disallow: \/$/m);
  });

  /**
   * Derived, not enumerated. The stock art was 22 files and two of them were live — one in the
   * pre-boot spinner, one behind an unrouted home page — so "delete the orphans" would have left
   * the console booting under a JHipster mascot. This fails if any of it comes back, including
   * through a generator re-run.
   */
  it('carries no JHipster stock art', () => {
    expect(readdirSync(IMAGES).filter(name => /jhipster/i.test(name))).toEqual([]);

    const offenders = readdirSync(WEBAPP, { recursive: true, encoding: 'utf8' })
      .filter(path => !path.startsWith('swagger-ui') && !path.endsWith('branding.spec.ts'))
      .filter(path => /\.(html|css|scss|ts|json|webapp|txt)$/.test(path))
      .filter(path => /jhipster_family|logo-jhipster/.test(read(`${WEBAPP}/${path}`)));
    expect(offenders).toEqual([]);
  });
});
