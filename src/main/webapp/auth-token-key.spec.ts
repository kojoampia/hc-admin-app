import { readFileSync, readdirSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { AUTHENTICATION_TOKEN_KEY } from 'app/shared/jhipster/constants';

/**
 * Every copy of the authentication token key in the webapp source tree, and which of them ship.
 *
 * <p>`swagger-ui/index.html` reads the key from both stores as a **hardcoded string literal**, and
 * `angular.json` copies that directory verbatim, so the page is live on `/admin/docs` wherever the
 * gateway's `api-docs` profile is on. The page lives outside the Angular application and loads
 * without it, so it cannot import the constant. The duplication is therefore **deliberate and kept**
 * — this file exists to make it visible rather than to pretend it is gone.
 *
 * <p>⚠ **It asserts the constant's VALUE, not its name, and that is the whole point.** A sweep for
 * `AUTHENTICATION_TOKEN_KEY` finds every `.ts` caller and still cannot see the page, because a bare
 * literal is not reachable from the constant that names it. Rename the value and every caller moves
 * with it; the page keeps reading the old key, Swagger's `requestInterceptor` stops sending a
 * `Bearer` header, and **nothing fails** — the page loads, the explorer renders, and every "Try it
 * out" call goes unauthenticated. That is the rename hazard in its worst form: invisible to the
 * search you would actually run.
 *
 * <p>⛔ **Never spell the key's value in this file.** It is imported, and this file is inside the
 * tree being swept — a literal written here, even in a comment, would register as a third copy.
 *
 * <p>**Scope, stated with the claim, because a sweep's scope is part of its claim.** The tree walked
 * is `angular.json`'s own `sourceRoot`, so nothing here enumerates a directory; shipped-ness is
 * derived from its `assets` array and `index` rather than listed, and an asset shape this file
 * cannot expand throws instead of silently narrowing the sweep. What it does **not** reach is
 * anything outside that tree: `cypress.config.ts` holds a third copy as `jwtStorageName`, which every
 * Cypress console spec reads through rather than spelling out. That copy is not this hazard — on a
 * rename the harness reads a key nobody wrote, `signInAs` produces null and those specs fail loudly
 * — but it is a copy, and a rename has to move it.
 */
describe('the authentication token key', () => {
  interface AssetGlob {
    glob: string;
    input: string;
    ignore?: string[];
  }

  type AssetEntry = string | AssetGlob;

  interface AngularProject {
    sourceRoot: string;
    architect: { build: { options: { index: string; assets: AssetEntry[] } } };
  }

  const angularJson = JSON.parse(readFileSync('angular.json', 'utf8')) as { projects: Record<string, AngularProject> };
  const projects = Object.values(angularJson.projects);
  if (projects.length !== 1) {
    throw new Error(`angular.json declares ${projects.length} projects; this spec derives its sweep from the only one.`);
  }
  const build = projects[0].architect.build.options;

  const walk = (path: string): string[] =>
    statSync(path).isDirectory() ? readdirSync(path).flatMap(name => walk(`${path}/${name}`)) : [path];

  /**
   * One `assets` entry to the files it copies. It throws on a shape it does not understand rather
   * than returning what it managed to expand: a sweep that quietly covers less than it says is the
   * defect this file was written for, one level up.
   */
  const expand = (entry: AssetEntry): string[] => {
    if (typeof entry === 'string') {
      return walk(entry);
    }
    if (entry.glob !== '**/*') {
      throw new Error(`angular.json ships ${entry.input} under glob ${entry.glob}, which this spec cannot expand — teach it how.`);
    }
    const ignored = (entry.ignore ?? []).map(pattern => {
      if (!pattern.endsWith('/**')) {
        throw new Error(`angular.json ignores ${pattern} under ${entry.input} in a shape this spec cannot expand — teach it how.`);
      }
      return `${entry.input}/${pattern.slice(0, -'/**'.length)}/`;
    });
    return walk(entry.input).filter(path => !ignored.some(prefix => path.startsWith(prefix)));
  };

  const DEFINITION = 'src/main/webapp/app/shared/jhipster/constants.ts';
  const API_DOCS_PAGE = 'src/main/webapp/swagger-ui/index.html';

  const sourceFiles = walk(projects[0].sourceRoot).sort();
  const shipped = new Set([build.index, ...build.assets.flatMap(expand)]);

  // Read as bytes rather than text so no file has to be filtered out by extension first — an
  // exclusion list is the other way a sweep comes to cover less than it claims.
  const copies = sourceFiles.filter(path => readFileSync(path).includes(AUTHENTICATION_TOKEN_KEY));

  /**
   * The premise the rest of this file rests on. An unmatched sweep and a clean one read identically,
   * so the walk has to be shown to have reached both the deep application tree and the vendored
   * directory beside it before its emptiness means anything.
   */
  it('walks the whole source tree angular.json names', () => {
    expect(sourceFiles.length).toBeGreaterThan(100);
    expect(sourceFiles).toContain(DEFINITION);
    expect(sourceFiles).toContain(API_DOCS_PAGE);
  });

  /**
   * The guard. Renaming the constant's value without editing the page leaves the page holding a
   * string this list no longer contains, so the sweep returns the definition alone and this fails —
   * which is the only thing standing between a rename and an unauthenticated API explorer.
   *
   * <p>It fails in the other direction too: a new shipped asset that hardcodes the key joins the
   * list, and the duplication stays a decision somebody took rather than one that accumulated.
   */
  it('is spelled out in exactly the files known to hardcode it', () => {
    expect(copies).toEqual([DEFINITION, API_DOCS_PAGE].sort());
  });

  /**
   * Why the copy matters, derived rather than asserted from memory: the page is not dead code, it is
   * copied into the build. If `swagger-ui` ever leaves the assets list this goes red, and the right
   * answer then is to delete the page rather than to keep a literal nothing serves.
   */
  it('is hardcoded on a page angular.json actually ships', () => {
    expect(shipped.has(API_DOCS_PAGE)).toBe(true);
    // The definition is application source and ships only as compiled bundle output — which is
    // precisely why a sweep scoped to shipped assets alone would not see either file's relationship
    // to the other.
    expect(shipped.has(DEFINITION)).toBe(false);
  });

  /**
   * A rename half-applied within the page is the same defect one field along: update the
   * `localStorage` literal, miss the `sessionStorage` one, and a token stored by a session without
   * "remember me" stops being found while everything else works.
   */
  it('is the key in every storage read on the API-docs page', () => {
    const reads = [...readFileSync(API_DOCS_PAGE, 'utf8').matchAll(/(local|session)Storage\.getItem\(\s*(['"])(.*?)\2\s*\)/g)].map(
      ([, store, , key]) => ({ store, key }),
    );

    expect(reads.map(read => read.store).sort()).toEqual(['local', 'session']);
    expect(new Set(reads.map(read => read.key))).toEqual(new Set([AUTHENTICATION_TOKEN_KEY]));
  });
});
