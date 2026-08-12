import { describe, expect, it } from 'vitest';

import { MissingTranslationHandlerImpl, humaniseTranslationKey, translationNotFoundMessage } from './translation.config';

/**
 * The health screen labels whatever actuator reports, and that set is decided by the gateway's
 * configuration rather than by this repository. Enabling a mail sender or turning Consul on adds a
 * component nobody has translated — which used to render as a raw key in a column of English.
 *
 * So unknown `health.indicator.*` keys get a readable fallback, and everything else keeps the loud
 * placeholder, because a missing label on a phrase someone was meant to write is a bug.
 */
describe('humaniseTranslationKey', () => {
  it.each([
    ['diskSpace', 'Disk space'],
    ['reactiveDiscoveryClients', 'Reactive discovery clients'],
    ['refreshScope', 'Refresh scope'],
    ['hc-admin-gateway', 'Hc admin gateway'],
    ['livenessState', 'Liveness state'],
    ['r2dbc', 'R2dbc'],
  ])('turns %s into %s', (key, expected) => {
    expect(humaniseTranslationKey(key)).toEqual(expected);
  });

  it('reproduces a hand-written label, which is why this is a safe floor', () => {
    // 'Disk space' is verbatim what the i18n file already said for diskSpace.
    expect(humaniseTranslationKey('diskSpace')).toEqual('Disk space');
  });
});

describe('MissingTranslationHandlerImpl', () => {
  const handler = new MissingTranslationHandlerImpl();

  it('humanises an unlabelled health component', () => {
    expect(handler.handle({ key: 'health.indicator.jmsBroker' } as any)).toEqual('Jms broker');
  });

  it('still shouts about a missing phrase everywhere else', () => {
    const result = handler.handle({ key: 'global.menu.somethingNobodyWrote' } as any);
    expect(result).toContain(translationNotFoundMessage);
  });
});
