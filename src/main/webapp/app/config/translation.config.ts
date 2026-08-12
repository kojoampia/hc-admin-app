import { MissingTranslationHandler, MissingTranslationHandlerParams, TranslateLoader } from '@ngx-translate/core';
import { loadLocale } from 'i18n';
import { Observable, from } from 'rxjs';

export const translationNotFoundMessage = 'translation-not-found';

/**
 * Key prefixes whose leaf is a name from a running system rather than a phrase someone wrote.
 *
 * `health.indicator.*` is the case this exists for: the health screen renders
 * `'health.indicator.' + key` for whatever components actuator reports, and that set is decided by
 * the gateway's configuration, not by this repository. Enabling a mail sender or switching Consul on
 * adds a component nobody has translated, and the operator gets `reactiveDiscoveryClients` in a
 * column of plain English. Five of them shipped that way.
 *
 * For these keys a humanised leaf is a better answer than a loud placeholder — it is readable, and
 * it is what the hand-written labels look like anyway (`diskSpace` → "Disk space" is exactly the
 * entry that was already in the file). Everything else keeps the noisy marker, because a missing
 * label on a phrase someone was supposed to write is a bug and should look like one.
 */
const HUMANISED_KEY_PREFIXES = ['health.indicator.'];

/**
 * `reactiveDiscoveryClients` → `Reactive discovery clients`; `hc-admin-gateway` → `Hc admin gateway`.
 *
 * Splits camelCase, treats `-`, `_` and `.` as spaces, then sentence-cases. Acronyms come out
 * capitalised only at the start (`ssl` → `Ssl`), which is why the ones that matter are still
 * translated by hand — this is the floor, not a replacement for writing labels.
 */
export function humaniseTranslationKey(leaf: string): string {
  const words = leaf
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[-_.]+/g, ' ')
    .trim()
    .toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export class MissingTranslationHandlerImpl implements MissingTranslationHandler {
  handle(params: MissingTranslationHandlerParams): string {
    const { key } = params;
    const prefix = HUMANISED_KEY_PREFIXES.find(candidate => key.startsWith(candidate));
    if (prefix !== undefined) {
      return humaniseTranslationKey(key.slice(prefix.length));
    }
    return `${translationNotFoundMessage}[${key}]`;
  }
}

export function translatePartialLoader(): TranslateLoader {
  return {
    getTranslation(lang: string): Observable<any> {
      return from(loadLocale(lang as any));
    },
  };
}

export function missingTranslationHandler(): MissingTranslationHandler {
  return new MissingTranslationHandlerImpl();
}
