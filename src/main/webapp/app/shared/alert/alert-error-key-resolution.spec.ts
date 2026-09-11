import { readFileSync, readdirSync } from 'node:fs';

import { HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';

import { MissingTranslationHandler, TranslateService, TranslationObject, provideTranslateService } from '@ngx-translate/core';
import deepmerge from 'deepmerge';
import { describe, expect, it } from 'vitest';

import { missingTranslationHandler, translationNotFoundMessage } from 'app/config/translation.config';
import { AlertService } from 'app/core/util/alert.service';
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
 * <p><b>The bundles have to be merged, not read one at a time.</b> `error.*` is split across two
 * files — `error.json` holds the error page, `concurrencyFailure` and `validation`; `global.json`
 * holds `idexists`, `userexists` and friends — and the console sees neither: the build deep-merges
 * every `i18n/<lang>/*.json` into one `<lang>.json` (`build-plugins/i18n-esbuild.ts`,
 * `prepareLanguage`). Reading a single file would answer a question nothing at runtime asks, and
 * would call a correctly-placed key missing. `prepareLanguage` is mirrored rather than imported
 * because `build-plugins/` is outside `tsconfig.spec.json`'s program.
 */

const I18N_DIR = 'src/main/webapp/i18n';

/**
 * Every language the repo ships, from the directory rather than from a list. There is one today; a
 * second added without this key reddens here, which is the intended answer — a key the api can raise
 * in any locale is not optional in one of them. Derived rather than enumerated for the reason the
 * pagination sweep is: a test whose coverage has to be extended by hand silently stops covering
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
 * The key `api` puts on the wire, defined once and used for both halves of this file — the response
 * fixture below and the bundle lookup — so neither half can pass by agreeing with a second copy of
 * the string.
 *
 * <p>`AmbiguousAccountException` sets the problem detail's `message` to `"error." + errorKey`, and
 * `VendorResource.refuseAnAmbiguousAccount` passes `accountidambiguous`.
 */
const AMBIGUOUS_ACCOUNT_KEY = 'error.accountidambiguous';

/**
 * Walks a dotted key's own segments through a merged bundle, so the lookup cannot disagree with the
 * nesting it is asserting. Anything that is not a leaf string — a missing key, or a key that resolves
 * to a subtree because it was nested one level too shallow — comes back undefined.
 */
function phraseFor(bundle: TranslationObject, key: string): string | undefined {
  const leaf = key.split('.').reduce<unknown>((node, segment) => (node as Record<string, unknown> | undefined)?.[segment], bundle);
  return typeof leaf === 'string' ? leaf : undefined;
}

/**
 * The 409 exactly as `AmbiguousAccountException` builds it: `title` carries the server's default
 * message, `message` carries the key, `params` carries the entity name **as a bare string** rather
 * than an object, and there is no `detail`.
 *
 * <p>That last pair is why the phrase this resolves to must not interpolate anything. `alert-error.ts`
 * hands `error.params` straight to ngx-translate as its interpolation parameters, and a string there
 * resolves no placeholder — a `{{ entityName }}` in this message would reach the screen verbatim. The
 * 400 path builds a proper `{ entityName }` object; this one does not.
 */
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

describe('error key resolution', () => {
  describe.each(LANGUAGES)('%s', language => {
    const bundle = mergedBundle(language);
    const phrase = phraseFor(bundle, AMBIGUOUS_ACCOUNT_KEY);

    /** Present, and present at the depth the key spells — `error` → `accountidambiguous`. */
    it('carries a phrase for the ambiguous-account conflict', () => {
      expect(phrase, `${AMBIGUOUS_ACCOUNT_KEY} resolves to nothing in the merged ${language} bundle`).toBeTypeOf('string');
      expect(phrase).not.toHaveLength(0);
    });

    /**
     * The point of the item: drive the real path and read what the operator reads. A key sitting at
     * the wrong depth, or in a file the merge does not pick up, passes nothing here.
     */
    it('renders a phrase rather than the raw key when the api answers 409', () => {
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

      // No auto-dismiss: the real service would leave a 5s timer running past the end of the spec,
      // and nothing here is about the timeout. `addAlert` skips the timer entirely at zero.
      TestBed.inject(AlertService).timeout = 0;

      const fixture = TestBed.createComponent(AlertError);
      const component = fixture.componentInstance;
      const eventManager = TestBed.inject(EventManager);

      eventManager.broadcast({ name: 'hcAdminApp.httpError', content: ambiguousAccountResponse() });

      expect(component.alerts()).toHaveLength(1);
      const [alert] = component.alerts();
      expect(alert.translationKey).toBe(AMBIGUOUS_ACCOUNT_KEY);
      // The two ways an unresolved key reaches the screen: as itself, or as the loud placeholder.
      expect(alert.message).not.toBe(AMBIGUOUS_ACCOUNT_KEY);
      expect(alert.message).not.toContain(translationNotFoundMessage);
      expect(alert.message).toBe(phrase);
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
