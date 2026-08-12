import { describe, expect, it } from 'vitest';

import health from '../../../i18n/en/health.json';

/**
 * Every health component the gateway reports has a label.
 *
 * <p>`health.html` renders `'health.indicator.' + componentHealth.key`, and ngx-translate falls back
 * to printing the key itself when there is no entry. So a missing label is not an error anywhere —
 * it is an operator reading `reactiveDiscoveryClients` in a table of otherwise plain English, which
 * is how five of these went unnoticed.
 *
 * The list below is what `GET /management/health` returns from the deployed gateway, taken from the
 * live response rather than guessed. It is deliberately explicit: if actuator starts reporting
 * something new, this test does not know about it — but it does stop the existing labels being
 * deleted, which is the failure that already happened once. The file had accumulated thirteen
 * entries for services actuator has never reported (`hc-patient-gateway` and friends, copied from
 * the prototype's hardcoded service list) while lacking labels for the ones it does.
 */
const REPORTED_BY_THE_GATEWAY = [
  'consul',
  'discoveryComposite',
  'diskSpace',
  'livenessState',
  'mongo',
  'ping',
  'reactiveDiscoveryClients',
  'readinessState',
  'refreshScope',
  'ssl',
];

describe('health indicator labels', () => {
  const indicators = health.health.indicator as Record<string, string>;

  it.each(REPORTED_BY_THE_GATEWAY)('labels the %s component', key => {
    expect(indicators[key]).toBeTruthy();
  });

  it('carries no label for a component actuator does not report', () => {
    // The prototype's service names are not actuator components. If one comes back, someone has
    // copied from admin-demo.html again.
    const prototypeLeftovers = Object.keys(indicators).filter(key => key.startsWith('hc-'));
    expect(prototypeLeftovers).toEqual([]);
  });
});
