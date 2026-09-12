import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';

import { HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';

import { MissingTranslationHandler, TranslateService, TranslationObject, provideTranslateService } from '@ngx-translate/core';
import deepmerge from 'deepmerge';
import { describe, expect, it } from 'vitest';

import { missingTranslationHandler, translationNotFoundMessage } from 'app/config/translation.config';
import { AlertModel, AlertService } from 'app/core/util/alert.service';
import { EventManager } from 'app/core/util/event-manager.service';

import { AlertError } from './alert-error';

/**
 * A message key an alert carries but no bundle answers renders exactly like a key nobody ever wrote:
 * the raw string, in front of the user, inside an error toast.
 *
 * <p>`alert-error.spec.ts` cannot see that, and deliberately so — it replaces `AlertService.addAlert`
 * with a stub in order to assert which key was chosen, so every case there passes whether or not the
 * key resolves. That is the right test for routing and the wrong one for rendering, and the gap is
 * what let `error.accountidambiguous` ship untranslated for as long as it existed (backlog item 86).
 * So this file keeps the real `AlertService` and the real `MissingTranslationHandlerImpl`, loads the
 * bundles off disk, and asserts the **text**.
 *
 * <p><b>Both halves of the join are derived, since backlog item 92.</b> Item 86 answered one key and
 * named it here; twelve more were missing and nobody knew, because a spec that enumerates the keys it
 * checks has the same hole as the bundle it is checking — the next exception somebody adds is in
 * neither. So the languages come from the i18n directory, and the **keys come from `api`'s Java**:
 * every class that builds a `"error." + errorKey` problem detail is found, every `new` of one of them
 * is read, and the literal it passes is the key this bundle has to answer. Adding an exception in
 * `api` without a phrase here now reddens this file by construction.
 *
 * <p><b>The bundles have to be merged, not read one at a time.</b> `error.*` is split across two
 * files — `error.json` holds the error page, `concurrencyFailure` and `validation`; `global.json`
 * holds `idexists`, `userexists` and, since item 92, the rest of the 400 family — and the console sees
 * neither: the build deep-merges every `i18n/<lang>/*.json` into one `<lang>.json`
 * (`build-plugins/i18n-esbuild.ts`, `prepareLanguage`). Reading a single file would answer a question
 * nothing at runtime asks, and would call a correctly-placed key missing. `prepareLanguage` is
 * mirrored rather than imported because `build-plugins/` is outside `tsconfig.spec.json`'s program.
 */

const I18N_DIR = 'src/main/webapp/i18n';

/**
 * Every language the repo ships, from the directory rather than from a list. There is one today; a
 * second added without these keys reddens here, which is the intended answer — a key the api can
 * raise in any locale is not optional in one of them. Derived rather than enumerated for the reason
 * the pagination sweep is: a test whose coverage has to be extended by hand silently stops covering
 * things.
 */
const LANGUAGES = readdirSync(I18N_DIR, { withFileTypes: true })
  .filter(entry => entry.isDirectory())
  .map(entry => entry.name);

/** What the console holds for a language, merged the way the build merges it. */
function mergedBundle(language: string): TranslationObject {
  return readdirSync(`${I18N_DIR}/${language}`)
    .filter(file => file.endsWith('.json'))
    .reduce<TranslationObject>(
      (merged, file) => deepmerge(merged, JSON.parse(readFileSync(`${I18N_DIR}/${language}/${file}`, 'utf8')) as TranslationObject),
      {},
    );
}

/**
 * Walks a dotted key's own segments through a merged bundle, so the lookup cannot disagree with the
 * nesting it is asserting. Anything that is not a leaf string — a missing key, or a key that resolves
 * to a subtree because it was nested one level too shallow — comes back undefined.
 */
function phraseFor(bundle: TranslationObject, key: string): string | undefined {
  const leaf = key.split('.').reduce<unknown>((node, segment) => (node as Record<string, unknown> | undefined)?.[segment], bundle);
  return typeof leaf === 'string' ? leaf : undefined;
}

// ---------------------------------------------------------------------------------------------
// The other side of the join: the keys `api` can put on the wire.
// ---------------------------------------------------------------------------------------------

/**
 * Where `hc-admin-service`'s sources are.
 *
 * <p><b>`api` is a sibling checkout, not a dependency</b>, so it is present in every developer tree
 * by the workspace layout and present in CI only because `ci.yml` checks it out on purpose (sparse,
 * `src/main/java` alone, into the path this variable names). Both routes are covered: the variable
 * wins when it is set, and otherwise the nearest ancestor directory holding an `api/src/main/java` is
 * used — an ancestor walk rather than a literal `../api`, because an agent worktree lives at
 * `<repo>/.claude/worktrees/agent-*` and `..` from there is not the product root.
 *
 * <p><b>Absent means red, never green.</b> A sweep that quietly passes when it cannot find the thing
 * it is sweeping is the defect this file exists to prevent, one level up: it would go on reporting
 * success for exactly as long as it checked nothing. The failure names the variable and what to point
 * it at, because the likely reader is somebody who cloned this repository on its own.
 */
const API_SOURCE_ENV = 'ABF_API_SOURCE';
const API_JAVA_ROOT = join('src', 'main', 'java');

function apiJavaRoot(): string {
  const named = process.env[API_SOURCE_ENV];
  if (named) {
    const root = isAbsolute(named) ? named : resolve(process.cwd(), named);
    if (!existsSync(join(root, API_JAVA_ROOT))) {
      throw new Error(
        `${API_SOURCE_ENV} is set to "${named}", and there is no ${API_JAVA_ROOT} under it. ` +
          'It must point at a checkout of kojoampia/hc-admin-service.',
      );
    }
    return join(root, API_JAVA_ROOT);
  }
  for (let dir = resolve(process.cwd()); ; dir = dirname(dir)) {
    if (existsSync(join(dir, 'api', API_JAVA_ROOT))) {
      return join(dir, 'api', API_JAVA_ROOT);
    }
    if (dirname(dir) === dir) {
      throw new Error(
        'The admin service sources were not found, so the error keys this console has to answer cannot be derived. ' +
          `Clone kojoampia/hc-admin-service beside this repository as "api", or set ${API_SOURCE_ENV} to an existing checkout. ` +
          'This is deliberately an error rather than a skip: a sweep that cannot see its subject must not report success.',
      );
    }
  }
}

/** Every `.java` file under a directory, in a stable order. */
function javaFilesUnder(dir: string): string[] {
  return readdirSync(dir)
    .sort()
    .flatMap(entry => {
      const path = join(dir, entry);
      if (statSync(path).isDirectory()) {
        return javaFilesUnder(path);
      }
      return path.endsWith('.java') ? [path] : [];
    });
}

/**
 * The top-level arguments of the call whose `(` is at `open`, raw and untrimmed of comments inside
 * them, plus the index just past its `)`.
 *
 * <p>Steps over string literals, text blocks, character literals and both comment forms rather than
 * splitting on commas, because every one of those can contain a comma or a bracket — the same lesson
 * `LogPseudonymTest` learned when a `);` inside a format string truncated its capture (item 59).
 */
function argumentsAt(source: string, open: number): { args: string[]; end: number } {
  const args: string[] = [];
  let current = '';
  let depth = 1;
  let i = open + 1;
  while (depth > 0) {
    if (i >= source.length) {
      throw new Error(`Unbalanced call at offset ${open}: the api source does not parse the way this sweep assumes.`);
    }
    const rest = source.slice(i);
    if (rest.startsWith('"""')) {
      const close = source.indexOf('"""', i + 3);
      const end = close === -1 ? source.length : close + 3;
      current += source.slice(i, end);
      i = end;
      continue;
    }
    const char = source[i];
    if (char === '"' || char === "'") {
      let j = i + 1;
      while (j < source.length && source[j] !== char) {
        j += source[j] === '\\' ? 2 : 1;
      }
      current += source.slice(i, j + 1);
      i = j + 1;
      continue;
    }
    if (rest.startsWith('//')) {
      const line = source.indexOf('\n', i);
      i = line === -1 ? source.length : line;
      continue;
    }
    if (rest.startsWith('/*')) {
      const close = source.indexOf('*/', i + 2);
      i = close === -1 ? source.length : close + 2;
      continue;
    }
    if (char === '(' || char === '[' || char === '{') {
      depth += 1;
    } else if (char === ')' || char === ']' || char === '}') {
      depth -= 1;
      if (depth === 0) {
        args.push(current);
        return { args: args.map(argument => argument.trim()).filter((argument, index) => argument !== '' || index > 0), end: i + 1 };
      }
    } else if (char === ',' && depth === 1) {
      args.push(current);
      current = '';
      i += 1;
      continue;
    }
    current += char;
    i += 1;
  }
  /* v8 ignore next 2 -- unreachable: the loop returns at depth 0 and throws past the end of input. */
  throw new Error('unreachable');
}

/** Every `new <Name>(` in a source, as the offset of its `(`. */
function constructionsOf(source: string, name: string): number[] {
  const pattern = new RegExp(String.raw`\bnew\s+${name}\s*\(`, 'g');
  return [...source.matchAll(pattern)].map(match => match.index + match[0].length - 1);
}

/**
 * An exception class in `api` whose problem detail carries a console message key.
 *
 * <p>Found by what it *does* — `.withProperty("message", "error." + <param>)` — rather than by a list
 * of class names, so a third one added tomorrow is swept without anybody editing this file. That is
 * the whole of item 92: `BadRequestAlertException` and `AmbiguousAccountException` are today's
 * population and naming them here would rebuild the hole one level up.
 */
interface MessageKeyException {
  name: string;
  file: string;
  /** What the console does with a refusal at this status decides which branch renders it. */
  status: number;
}

/** The statuses these exceptions are built with, and the wire status text that goes with each. */
const STATUS_TEXT: Record<string, [number, string]> = {
  BAD_REQUEST: [400, 'Bad Request'],
  CONFLICT: [409, 'Conflict'],
};

function messageKeyExceptions(files: string[]): MessageKeyException[] {
  const found: MessageKeyException[] = [];
  for (const file of files) {
    const source = readFileSync(file, 'utf8');
    const builds = /\.withProperty\(\s*"message"\s*,\s*"error\."\s*\+\s*([A-Za-z_$][\w$]*)\s*\)/.exec(source);
    if (!builds) {
      continue;
    }
    const [, keyParameter] = builds;
    const declared = /\bclass\s+(\w+)\s+extends\b/.exec(source);
    if (!declared) {
      throw new Error(`${file} builds a message key and declares no class this sweep can name.`);
    }
    const [, name] = declared;

    // The call sites below are read positionally, so the assumption that makes that sound is checked
    // rather than trusted: the key is the LAST parameter of every constructor. A class that took it
    // anywhere else would have its entityName swept as a key, which passes or fails for reasons
    // nothing to do with translation.
    const constructors = [...source.matchAll(new RegExp(String.raw`\b(?:public|protected|private)\s+${name}\s*\(`, 'g'))];
    expect(constructors.length, `${name} declares no constructor this sweep can read`).toBeGreaterThan(0);
    for (const constructor of constructors) {
      const { args } = argumentsAt(source, constructor.index + constructor[0].length - 1);
      const last = args.at(-1)!.split(/\s+/).at(-1);
      expect(last, `${name}'s constructor must take its message key last; this sweep reads call sites by position`).toBe(keyParameter);
    }

    const status = /HttpStatus\.([A-Z_]+)/.exec(source);
    if (!status || !(status[1] in STATUS_TEXT)) {
      throw new Error(
        `${name} answers with ${status ? status[1] : 'no HttpStatus this sweep could find'}, which this file has no fixture for. ` +
          'The console renders 0, 400 and 404 on branches of their own (`alert-error.ts`), so a message key on one of those ' +
          'may not reach the bundle at all — decide what it should do before widening STATUS_TEXT.',
      );
    }
    found.push({ name, file, status: STATUS_TEXT[status[1]][0] });
  }
  return found;
}

/** A key the api can raise, and every place it raises it. */
interface RaisableKey {
  key: string;
  status: number;
  sites: string[];
}

function raisableKeys(): RaisableKey[] {
  const root = apiJavaRoot();
  const files = javaFilesUnder(root);
  const exceptions = messageKeyExceptions(files);
  expect(
    exceptions.map(exception => exception.name),
    'no message-key exception found in the api sources',
  ).toContain('BadRequestAlertException');

  const byKey = new Map<string, RaisableKey>();
  for (const file of files) {
    const source = readFileSync(file, 'utf8');
    for (const exception of exceptions) {
      for (const open of constructionsOf(source, exception.name)) {
        const { args } = argumentsAt(source, open);
        const literal = /^"((?:[^"\\]|\\.)*)"$/.exec(args.at(-1)!);
        const where = `${relative(root, file)}:${source.slice(0, open).split('\n').length}`;
        // A key assembled at runtime is a key this sweep cannot see, so it is refused rather than
        // skipped — silently narrowing the population is how the enumeration this replaced went stale.
        expect(literal, `${where} raises ${exception.name} with a message key that is not a string literal`).not.toBeNull();
        const key = `error.${literal![1]}`;
        const known = byKey.get(key);
        if (known) {
          known.sites.push(where);
        } else {
          byKey.set(key, { key, status: exception.status, sites: [where] });
        }
      }
    }
  }
  return [...byKey.values()].sort((left, right) => left.key.localeCompare(right.key));
}

const RAISABLE_KEYS = raisableKeys();

/**
 * The key `api` puts on the wire for the one case item 86 was opened for, defined once and used for
 * both halves of the fixture below, so neither half can pass by agreeing with a second copy of the
 * string.
 *
 * <p>`AmbiguousAccountException` sets the problem detail's `message` to `"error." + errorKey`, and
 * `VendorResource.refuseAnAmbiguousAccount` passes `accountidambiguous`.
 */
const AMBIGUOUS_ACCOUNT_KEY = 'error.accountidambiguous';

/**
 * The entity name the api puts in `params`. It is deliberately a constant rather than another thing
 * read out of the Java: nothing on the path these keys take reads it. `buildHeaders` never runs for a
 * `BadRequestAlertException` (backlog item 91), so `handleBadRequest` falls to its `error.message`
 * branch and passes the body's `params` through as ngx-translate's interpolation argument — where a
 * bare string resolves no placeholder. **That is why none of the phrases item 92 added interpolates**,
 * and it is a live wart rather than a house style: when item 91 restores the headers, a placeholder
 * becomes available on this family and these messages can be reworded to use one.
 */
const ENTITY_NAME_ON_THE_WIRE = 'directoryVendor';

/**
 * A refusal exactly as the api builds one: `title` carries the server's default message, `message`
 * carries the key, `params` carries the entity name **as a bare string** rather than an object, there
 * is no `detail`, and — the part that decides which client branch runs — **no headers at all**.
 */
function refusalResponse(key: string, status: number): HttpErrorResponse {
  return new HttpErrorResponse({
    url: 'http://localhost:8080/api/vendors',
    headers: new HttpHeaders(),
    status,
    statusText: Object.values(STATUS_TEXT).find(([code]) => code === status)![1],
    error: {
      status,
      title: 'The admin service refused the request',
      message: key,
      params: ENTITY_NAME_ON_THE_WIRE,
    },
  });
}

/** Item 86's own fixture, kept verbatim: the 409 with the message and the params it really sends. */
function ambiguousAccountResponse(): HttpErrorResponse {
  return new HttpErrorResponse({
    url: 'http://localhost:8080/api/vendors',
    headers: new HttpHeaders(),
    status: 409,
    statusText: 'Conflict',
    error: {
      status: 409,
      title: 'That account is held by more than one vendor, so it does not identify a record',
      message: AMBIGUOUS_ACCOUNT_KEY,
      params: 'vendor',
    },
  });
}

/**
 * What the operator reads, from what the alert carries.
 *
 * <p>`AlertService.addAlert` puts the translated phrase through `DomSanitizer.sanitize(HTML, …)`, and
 * Angular's sanitizer serialises every non-ASCII character as a **numeric entity** — so a phrase
 * containing an em dash arrives here as `&#8212;` while the screen shows the dash, because
 * `alert-error.html` binds it with `[innerHTML]`. Comparing the raw phrase to the raw alert would
 * therefore fail on punctuation, and — since the languages above are derived from the directory — the
 * first bundle with an umlaut or an accent in it would redden every case in this file for a reason
 * that has nothing to do with a missing key. Decoding keeps the assertion about the phrase.
 *
 * <p>The em dash in `error.linknotfound` is left in deliberately so this branch is exercised by the
 * one language that ships, rather than being reached for the first time by whoever adds the second.
 */
function asRendered(message: string): string {
  return message
    .replaceAll(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replaceAll('&quot;', '"')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&amp;', '&');
}

/** Drives the real path — real `AlertService`, real missing-translation handler — and returns what it raised. */
function alertsFor(language: string, bundle: TranslationObject, response: HttpErrorResponse): AlertModel[] {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      provideTranslateService({
        missingTranslationHandler: { provide: MissingTranslationHandler, useFactory: missingTranslationHandler },
      }),
      EventManager,
      AlertService,
    ],
  });

  const translateService = TestBed.inject(TranslateService);
  translateService.setTranslation(language, bundle);
  translateService.use(language);

  // No auto-dismiss: the real service would leave a 5s timer running past the end of the spec, and
  // nothing here is about the timeout. `addAlert` skips the timer entirely at zero.
  TestBed.inject(AlertService).timeout = 0;

  const fixture = TestBed.createComponent(AlertError);
  TestBed.inject(EventManager).broadcast({ name: 'hcAdminApp.httpError', content: response });
  return fixture.componentInstance.alerts();
}

describe('error key resolution', () => {
  /**
   * The sweep is only as good as its reach, and a scanner that quietly matches nothing reports a
   * clean bundle. These are the floor: the four JHipster keys have been raised since the generator's
   * first commit, so their absence means the scan broke rather than that the api stopped raising them.
   */
  it('finds the keys the api raises, rather than a list somebody maintains', () => {
    expect(RAISABLE_KEYS.map(raisable => raisable.key)).toEqual(
      expect.arrayContaining(['error.idexists', 'error.idinvalid', 'error.idnotfound', 'error.idnull']),
    );
    expect(RAISABLE_KEYS.length, 'far fewer keys than the api has ever raised — the scan has stopped seeing them').toBeGreaterThan(14);
    for (const raisable of RAISABLE_KEYS) {
      expect(raisable.sites.length, `${raisable.key} was derived from no call site`).toBeGreaterThan(0);
    }
  });

  describe.each(LANGUAGES)('%s', language => {
    const bundle = mergedBundle(language);

    describe.each(RAISABLE_KEYS)('$key', ({ key, status, sites }) => {
      const phrase = phraseFor(bundle, key);

      /** Present, and present at the depth the key spells — `error` → `accountidambiguous`. */
      it('has a phrase, at the depth the key spells', () => {
        expect(phrase, `${key} resolves to nothing in the merged ${language} bundle. Raised at ${sites.join(', ')}`).toBeTypeOf('string');
        expect(phrase).not.toHaveLength(0);
      });

      /**
       * The point of the item: drive the real path and read what the operator reads. A key sitting at
       * the wrong depth, or in a file the merge does not pick up, passes nothing here.
       */
      it('renders a phrase rather than the raw key', () => {
        const alerts = alertsFor(language, bundle, refusalResponse(key, status));

        expect(alerts).toHaveLength(1);
        const [alert] = alerts;
        expect(alert.translationKey).toBe(key);
        // The two ways an unresolved key reaches the screen: as itself, or as the loud placeholder.
        expect(alert.message).not.toBe(key);
        expect(alert.message).not.toContain(translationNotFoundMessage);
        expect(asRendered(alert.message!)).toBe(phrase);
      });
    });
  });

  describe.each(LANGUAGES)('%s, on the conflict item 86 was opened for', language => {
    const bundle = mergedBundle(language);
    const phrase = phraseFor(bundle, AMBIGUOUS_ACCOUNT_KEY);

    /** The 409 as `AmbiguousAccountException` really sends it, params and all. */
    it('renders a phrase rather than the raw key when the api answers 409', () => {
      const alerts = alertsFor(language, bundle, ambiguousAccountResponse());

      expect(alerts).toHaveLength(1);
      const [alert] = alerts;
      expect(alert.translationKey).toBe(AMBIGUOUS_ACCOUNT_KEY);
      expect(alert.message).not.toBe(AMBIGUOUS_ACCOUNT_KEY);
      expect(alert.message).not.toContain(translationNotFoundMessage);
      expect(asRendered(alert.message!)).toBe(phrase);
    });

    /**
     * The message is the repair instruction — it is the only place an operator meets it, the rest of
     * it being a line in the server log. "Something is wrong" is what the raw key already said.
     */
    it('tells the operator what to do about it', () => {
      expect(phrase).toMatch(/\bclear\b/i);
      expect(phrase).toMatch(/portal login/i);
      // The operator's vocabulary, not the schema's.
      expect(phrase).not.toMatch(/account_id|index|collection/i);
    });
  });
});
