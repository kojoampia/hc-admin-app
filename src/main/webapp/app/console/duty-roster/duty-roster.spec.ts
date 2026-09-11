import { beforeEach, describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';

import { readFileSync } from 'node:fs';

import dayjs from 'dayjs/esm';

import DutyRoster, { MAX_VISITS_PER_ROUND, SHIFT_CYCLE, nextShift, visitWindow } from './duty-roster';
import { RoundCustomer } from './roster-plan.service';

/**
 * The grid's arithmetic, which the dashboard now has to match.
 *
 * <p>The hero said "roster cover at 0% for the week" while this screen, one click away, said 80%
 * over the same roster. Both were internally consistent and neither was obviously wrong — they did
 * not mean the same thing by "cover", and nothing on either side asserted what it meant.
 *
 * <p>These figures are the definition the api adopted, so the numbers below are deliberately the
 * same ones `RosterCoverIT.coverIsTheGridsFraction` asserts server-side: two rosterable
 * professionals, nine planned cells of fourteen, one of them OFF. <b>If you change a number here,
 * that suite has to change with it</b> — which is the point, because the alternative is the two
 * drifting apart in silence again.
 */
describe('duty roster figures', () => {
  let component: DutyRoster;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]), provideTranslateService()],
    });
    // Constructed in an injection context rather than rendered: these are pure computed signals over
    // `rows`, and going through the template would drag in the whole entity stack to assert nothing
    // extra. `ngOnInit` is deliberately never called, so no request is made.
    component = TestBed.runInInjectionContext(() => new DutyRoster());
  });

  /** Nine of fourteen — a fraction no rounding accident and no all-or-nothing formula can reach. */
  it('measures cover against the whole grid, not against the cells that are filled', () => {
    component.rows.set([
      row('p1', ['DAY', 'DAY', 'OFF', 'NIGHT', 'EVENING', null, null]),
      row('p2', ['NIGHT', 'NIGHT', 'DAY', 'DAY', null, null, null]),
    ]);

    expect(component.totalSlots()).toBe(14);
    expect(component.filledSlots()).toBe(9);
    expect(component.coverPercent()).toBe(64);
    expect(component.unassignedSlots()).toBe(5);
    expect(component.rows().length).toBe(2);
    // Eight, not nine: OFF is planned, but it is not a shift.
    expect(component.workedShifts()).toBe(8);
  });

  /**
   * A professional with an entirely empty week is still a row.
   *
   * <p>They are the person the screen exists to surface. Were capacity taken from "professionals who
   * have a shift" instead of from the grid, their seven empty cells would leave both the numerator
   * and the denominator, and a half-planned roster would report itself fully covered.
   */
  it('counts an unrostered professional as capacity', () => {
    component.rows.set([
      row('p1', ['DAY', 'DAY', 'DAY', 'DAY', 'DAY', 'DAY', 'DAY']),
      row('p2', [null, null, null, null, null, null, null]),
    ]);

    expect(component.coverPercent()).toBe(50);
    expect(component.unassignedSlots()).toBe(7);
  });

  /** An empty roster is uncovered, not perfectly covered, and an empty grid must not divide by zero. */
  it('reports no cover rather than full cover for an empty grid', () => {
    component.rows.set([]);

    expect(component.coverPercent()).toBe(0);
    expect(component.unassignedSlots()).toBe(0);
  });

  /**
   * `FLEXIBLE` is a worked shift, and the three cell states do not move because of it.
   *
   * <p>The states this grid has to keep apart are *no row*, *rostered rest* and *worked*. Adding a
   * fifth enum value adds a worked one, so `unassignedSlots` stays a subtraction from capacity and
   * `OFF` stays the only planned value that is not a shift. The row below is deliberately the same
   * shape as the cover fixture with one `DAY` swapped for a `FLEXIBLE`: every figure has to be
   * unchanged, which is a stronger statement than any of them being right.
   */
  it('counts a flexible block as worked, leaving the three cell states where they were', () => {
    component.rows.set([
      row('p1', ['FLEXIBLE', 'DAY', 'OFF', 'NIGHT', 'EVENING', null, null]),
      row('p2', ['NIGHT', 'NIGHT', 'DAY', 'DAY', null, null, null]),
    ]);

    expect(component.filledSlots()).toBe(9);
    expect(component.unassignedSlots()).toBe(5);
    expect(component.coverPercent()).toBe(64);
    // Still eight, and still because of the OFF rather than because of the FLEXIBLE.
    expect(component.workedShifts()).toBe(8);
    expect(component.onDutyPerDay()[0]).toBe(2);
  });

  /**
   * The cycle, and specifically where `FLEXIBLE` sits in it.
   *
   * <p>`OFF` has to remain the last stop before the wrap, because it is the wrap **past `OFF`** that
   * deletes the assignment — unassigned is the absence of a row, not a row with a null shift. Append
   * `FLEXIBLE` at the end instead and cycling past a rest day produces a shift rather than clearing
   * the cell, which is a different grid and would not fail any of the arithmetic above.
   */
  it('cycles unassigned -> day -> evening -> night -> flexible -> off -> unassigned', () => {
    expect(SHIFT_CYCLE).toEqual([null, 'DAY', 'EVENING', 'NIGHT', 'FLEXIBLE', 'OFF']);

    expect(nextShift(null)).toBe('DAY');
    expect(nextShift('NIGHT')).toBe('FLEXIBLE');
    expect(nextShift('FLEXIBLE')).toBe('OFF');
    expect(nextShift('OFF')).toBeNull();
  });

  function row(id: string, shifts: (string | null)[]): any {
    return {
      professional: { id, status: 'ACTIVE' },
      name: id,
      cells: shifts.map((shift, dayIndex) => ({ dayIndex, shift, assignmentId: shift === null ? null : `${id}-${dayIndex}` })),
    };
  }
});

/**
 * Planning writes to another stack, so this screen has to be able to say so.
 *
 * <p>Decision 10 of the roster migration: an empty roster grid and an unreachable roster service
 * must not look alike. Three states have to stay distinguishable — filed, could not be staffed,
 * could not be filed — and the last of them has to be a standing panel rather than a toast, because
 * a toast is gone by the time anybody asks why the roster is empty.
 */
describe('duty roster planning', () => {
  const template = readFileSync('src/main/webapp/app/console/duty-roster/duty-roster.html', 'utf8');
  let component: DutyRoster;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]), provideTranslateService()],
    });
    component = TestBed.runInInjectionContext(() => new DutyRoster());
  });

  /**
   * The publish call no longer sends `publishedAt`.
   *
   * <p>The api derives it from `published` and discards whatever arrives, so a client that still
   * sent one would be writing a value nothing reads — the two would differ with nothing failing.
   * Asserted on the request body rather than on the component, because the component is not where
   * it would come back.
   */
  it('publishes without claiming a publication time', () => {
    const sent: any[] = [];
    (component as any).rosterWeekService = { partialUpdate: (week: any) => (sent.push(week), { subscribe: () => undefined }) };
    component.week.set({ id: 'week-1', label: 'W', published: false });

    component.publish();

    expect(sent).toHaveLength(1);
    expect(sent[0]).toEqual({ id: 'week-1', published: true });
    expect(sent[0]).not.toHaveProperty('publishedAt');
  });

  /**
   * A failed cross-stack write is a standing panel on the screen, and it is not the same panel as a
   * failed call to our own api.
   *
   * <p>Read out of the template, because that is where the decision lives: a spec asserting a signal
   * would pass against a component that set the flag and rendered nothing.
   */
  it('renders an outage panel for a failed cross-stack write, distinct from a failed request', () => {
    expect(template).toContain('data-cy="rosterServiceOutage"');
    expect(template).toContain('data-cy="planCallFailed"');
    expect(template).toContain('!result.rosterServiceReachable');
    // role="alert" on all three: a failure has to reach a screen reader, not only a sighted reader.
    expect(template.match(/role="alert"/g) ?? []).toHaveLength(3);
  });

  /**
   * And a deployment that never dialled gets its own panel, not the outage one.
   *
   * <p>Backlog item 24. The outage panel says the roster service could not be reached, which sends a
   * reader to another stack or to the network for what is a missing environment variable in this
   * one — and it is a designed, plausible screen, so it looks like the feature working badly rather
   * than like a wrong reading. Asserted on the template and on the panel being driven by the round's
   * reason rather than by `rosterServiceReachable`, because putting it back on that flag is exactly
   * how this would be reintroduced.
   */
  it('renders a third panel for a deployment that dialled nothing, driven by the reason', () => {
    expect(template).toContain('data-cy="rosterServiceNotConfigured"');
    expect(template).toContain('rosterServiceNotConfigured()');
    expect(template).toContain('dutyRoster.plan.rosterServiceNotConfigured');

    component.report.set({
      date: '2026-09-06',
      rosterServiceReachable: true,
      rounds: [{ index: 0, outcome: 'FAILED', reason: 'ROSTER_SERVICE_NOT_CONFIGURED' }],
    });
    expect(component.rosterServiceNotConfigured()).toBe(true);

    // The genuine outage must not raise it, or the two panels show together and say opposite things.
    component.report.set({
      date: '2026-09-06',
      rosterServiceReachable: false,
      rounds: [{ index: 0, outcome: 'FAILED', reason: 'ROSTER_SERVICE_UNREACHABLE' }],
    });
    expect(component.rosterServiceNotConfigured()).toBe(false);

    component.report.set(null);
    expect(component.rosterServiceNotConfigured()).toBe(false);
  });

  /**
   * Every reason the api can send has a sentence, and the list is read rather than typed here.
   *
   * <p>A reason with no key renders its own key on the screen — `dutyRoster.plan.reason.
   * ROSTER_SERVICE_NOT_CONFIGURED` in the middle of a panel — which is a defect nothing else in this
   * repository would catch: the template interpolates the value, so it compiles, type-checks and
   * renders. The union in `roster-plan.service.ts` is the wire contract's copy on this side, so it
   * is what the catalogue is swept against; enumerating the reasons in this file instead would mean
   * a fourth list to keep in step, and a test whose coverage has to be extended by hand stops
   * covering things.
   */
  it('has a message for every reason the api can send', () => {
    const source = readFileSync('src/main/webapp/app/console/duty-roster/roster-plan.service.ts', 'utf8');
    const union = /export type PlanReason =([\s\S]*?);/.exec(source)?.[1] ?? '';
    const reasons = [...union.matchAll(/'([A-Z_]+)'/g)].map(match => match[1]);
    const messages = JSON.parse(readFileSync('src/main/webapp/i18n/en/dutyRoster.json', 'utf8')).dutyRoster.plan.reason;

    // The union parsed at all — an empty list would make every assertion below vacuous.
    expect(reasons.length).toBeGreaterThanOrEqual(5);
    expect(reasons).toContain('ROSTER_SERVICE_NOT_CONFIGURED');
    for (const reason of reasons) {
      expect(messages[reason], `no dutyRoster.plan.reason.${reason} for a reason the api can send`).toBeTruthy();
    }
    // And nothing in the catalogue that no reason can produce, which is how a renamed value leaves
    // its old sentence behind and reads as covered.
    expect(Object.keys(messages).sort()).toEqual([...reasons].sort());
  });

  /** Filed, not staffed and not filed are three renderings, and colour is never the only signal. */
  it('renders the three round outcomes distinctly', () => {
    expect(template).toContain("@case ('PLANNED')");
    expect(template).toContain("@case ('UNPLANNED')");
    expect(template).toContain("@case ('FAILED')");
    expect(template).toContain("'plan-result plan-result--' + round.outcome.toLowerCase()");
  });

  /** `OFF` is not offered: hc-professional refuses visits on a rest day, so the round would 400. */
  it('offers the four worked shifts and not OFF', () => {
    expect(component.planShifts).toEqual(['DAY', 'EVENING', 'NIGHT', 'FLEXIBLE']);
  });

  /**
   * Visit times land inside their shift's window, and successive visits do not overlap.
   *
   * <p>Both are rules hc-professional enforces with a 400, and both would arrive back here as "the
   * roster service refused the round" — which reads as a server fault rather than as a client that
   * sent 09:00 for a night shift. The night case is the one worth pinning: 23:00 belongs to the
   * round's own date and 00:00 to the next, which is the wrap the whole shift model turns on.
   */
  it('places visits inside the shift window and one hour apart', () => {
    expect(visitWindow('DAY', 0)).toEqual({ startTime: '08:00', endTime: '09:00' });
    expect(visitWindow('EVENING', 0)).toEqual({ startTime: '16:00', endTime: '17:00' });
    expect(visitWindow('NIGHT', 0)).toEqual({ startTime: '23:00', endTime: '00:00' });
    expect(visitWindow('NIGHT', 1)).toEqual({ startTime: '00:00', endTime: '01:00' });
    expect(visitWindow('FLEXIBLE', 0)).toEqual({ startTime: '10:00', endTime: '11:00' });
    // Second visit on a day round starts where the first ended, so they cannot overlap.
    expect(visitWindow('DAY', 1)).toEqual({ startTime: '09:00', endTime: '10:00' });
  });

  /**
   * The last visit that fits, and the first that does not.
   *
   * <p>`visitWindow` walks an hour per visit and nothing stopped it walking out of the shift, so an
   * eighth visit on a `DAY` round ran 15:00–16:00 and hc-professional refused the whole round. The
   * user was then told `ROSTER_SERVICE_REFUSED_THE_ROUND` — the far stack named for something they
   * typed in this box, with no way to connect the two.
   *
   * <p>Asserted against the window bounds rather than against the constant, so the cap and the
   * arithmetic cannot drift apart quietly. Both ends are inclusive in
   * `DutyRosterService.resolve`, which is why the last visit may end exactly on the boundary.
   */
  it('caps visits at the last one that fits inside the shift', () => {
    expect(visitWindow('DAY', MAX_VISITS_PER_ROUND.DAY - 1)).toEqual({ startTime: '14:00', endTime: '15:00' });
    expect(visitWindow('EVENING', MAX_VISITS_PER_ROUND.EVENING - 1)).toEqual({ startTime: '22:00', endTime: '23:00' });
    expect(visitWindow('NIGHT', MAX_VISITS_PER_ROUND.NIGHT - 1)).toEqual({ startTime: '06:00', endTime: '07:00' });
    expect(visitWindow('FLEXIBLE', MAX_VISITS_PER_ROUND.FLEXIBLE - 1)).toEqual({ startTime: '22:00', endTime: '23:00' });

    // And one past the cap leaves the window, which is what the far service refuses.
    expect(visitWindow('DAY', MAX_VISITS_PER_ROUND.DAY)).toEqual({ startTime: '15:00', endTime: '16:00' });
    expect(visitWindow('NIGHT', MAX_VISITS_PER_ROUND.NIGHT)).toEqual({ startTime: '07:00', endTime: '08:00' });
  });

  /** An OFF round carrying any visit at all is refused over there, so the cap is zero rather than small. */
  it('allows no visits on an OFF round', () => {
    expect(MAX_VISITS_PER_ROUND.OFF).toBe(0);
  });

  /**
   * The count is refused here, so the message names the input rather than the far service.
   *
   * <p>`canPlan()` is what the Plan button is disabled on, so this is the half a user meets.
   */
  it('refuses to plan more visits than the shift can hold', () => {
    component.week.set({ id: 'week-1', label: 'W', startDate: dayjs('2026-08-10') });
    component.planSpaceId = 'space-osu';
    component.planName = 'Morning round';
    component.planShift = 'DAY';

    component.chosenCustomers.set(Array.from({ length: MAX_VISITS_PER_ROUND.DAY }, (_, i) => customer(`hcp-${i}`, `Patient ${i}`)));
    expect(component.tooManyVisits()).toBeNull();
    expect(component.canPlan()).toBe(true);

    component.chosenCustomers.update(chosen => [...chosen, customer('hcp-one-too-many', 'One Too Many')]);
    expect(component.visitCount()).toBe(MAX_VISITS_PER_ROUND.DAY + 1);
    expect(component.tooManyVisits()).toBe(MAX_VISITS_PER_ROUND.DAY + 1);
    expect(component.canPlan()).toBe(false);
  });

  /** One visit per chosen patient — the count is the list, since a patient cannot be added twice. */
  it('counts one visit for each patient on the round', () => {
    component.customers.set([customer('hcp-a', 'Ama Ofori'), customer('hcp-b', 'Kwesi Mensah')]);

    component.planCustomerChoice = 'hcp-a';
    component.addCustomer();
    component.planCustomerChoice = 'hcp-b';
    component.addCustomer();

    expect(component.visitCount()).toBe(2);
  });

  /** The panel will not submit an unnamed or unplaced round; the api would refuse it anyway. */
  it('refuses to plan without an area and a name', () => {
    component.week.set({ id: 'week-1', label: 'W', startDate: dayjs('2026-08-10') });
    expect(component.canPlan()).toBe(false);

    component.planSpaceId = 'space-osu';
    expect(component.canPlan()).toBe(false);

    component.planName = 'Morning round';
    expect(component.canPlan()).toBe(true);
  });

  /** The date planned for is the chosen day of the week on screen, not "today". */
  it('plans for the chosen day of the displayed week', () => {
    component.week.set({ id: 'week-1', label: 'W', startDate: dayjs('2026-08-10') });
    component.planDayIndex = 3;

    expect(component.planDate()?.format('YYYY-MM-DD')).toBe('2026-08-13');
  });

  function customer(customerId: string, name: string | null): RoundCustomer {
    return { customerId, name };
  }
});

/**
 * The patient picker — backlog item 22, and the one assertion this block exists for is which id is
 * sent.
 *
 * <h2>Why a dropdown here is not the dropdown item 22 forbids</h2>
 *
 * <p>That entry says "do not close this by making the field a dropdown of hc-admin patients", and
 * the failure it names is sending `Patient.id` — this console's own key — which hc-professional
 * would accept, file, and turn into a day plan for nobody. The picker sends `customerId`, which the
 * api reads off the patient's `DirectoryLink.externalId`: hc-patient's own id for the person, and
 * the value a visit is actually keyed on over there.
 *
 * <p><b>`sends the sibling's id for the patient and never this console's` is the guard, and it was
 * watched failing</b> — changing `planRound` to send anything off the local record turns it red with
 * a message naming the confusion. It asserts the request body rather than the component, because the
 * body is what crosses the boundary.
 *
 * <h2>Who is absent, and why the screen has to say so</h2>
 *
 * <p>The api offers only patients whose link carries that id — six of fifteen in today's seed. Three
 * cases below pin the exclusions the fixture already has (an unlinked patient, a care angel, an
 * erased subject) at the level this side can see them: they never arrive in `customers()`, so what
 * this block asserts is that nothing on this side invents a row for them, and
 * `RoundCustomerServiceTest` asserts the server-side rule that keeps them out.
 */
describe('duty roster patient picker', () => {
  const template = readFileSync('src/main/webapp/app/console/duty-roster/duty-roster.html', 'utf8');
  let component: DutyRoster;
  let planned: any[];

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]), provideTranslateService()],
    });
    component = TestBed.runInInjectionContext(() => new DutyRoster());
    planned = [];

    component.week.set({ id: 'week-1', label: 'W', startDate: dayjs('2026-08-10') });
    component.planSpaceId = 'space-osu';
    component.planName = 'Morning round';
    (component as any).rosterPlanService = {
      plan: (request: any) => (planned.push(request), { subscribe: () => undefined }),
      spaces: () => ({ subscribe: () => undefined }),
      customers: () => ({ subscribe: () => undefined }),
    };
  });

  /**
   * <b>The id on the wire is hc-patient's, never this console's.</b>
   *
   * <p>Both halves are asserted: what goes on the visit, and what must not. The second is not
   * redundant — an implementation that sent the local id would fail the first with a string diff a
   * reader has to interpret, and fails the second with a sentence saying what the mistake is.
   */
  it("sends the sibling's id for the patient and never this console's", () => {
    // `a6` is the patient's id in THIS directory; `hcp-6120` is hc-patient's, off the link. Both are
    // the fixture's real values for one person, which is what makes the pair worth asserting.
    component.chosenCustomers.set([{ customerId: 'hcp-6120', name: 'Kwame Darkwa' }]);

    component.planRound();

    expect(planned).toHaveLength(1);
    const visits = planned[0].rounds[0].visits;
    expect(visits).toHaveLength(1);
    expect(visits[0].customerId).toBe('hcp-6120');
    expect(visits[0].customerId, 'sending Patient.id is the failure backlog item 22 exists to prevent').not.toBe('a6');
  });

  /** Visits are placed in the order the patients were added, an hour apart. */
  it('places one visit per chosen patient, in the order they were added', () => {
    component.planShift = 'DAY';
    component.customers.set([
      { customerId: 'hcp-6120', name: 'Kwame Darkwa' },
      { customerId: 'hcp-8814', name: 'naa.adjeley@mail.gh' },
    ]);

    component.planCustomerChoice = 'hcp-8814';
    component.addCustomer();
    component.planCustomerChoice = 'hcp-6120';
    component.addCustomer();
    component.planRound();

    expect(planned[0].rounds[0].visits).toEqual([
      { customerId: 'hcp-8814', startTime: '08:00', endTime: '09:00' },
      { customerId: 'hcp-6120', startTime: '09:00', endTime: '10:00' },
    ]);
  });

  /**
   * A patient with no link is not offered, and nothing on this side puts them back.
   *
   * <p>`a14` in the `test` fixture: a real, permanent state rather than a pending one — there is no
   * id to send for them, so the round cannot name them at all.
   */
  it('does not offer a patient the api left out for having no link', () => {
    component.customers.set([{ customerId: 'hcp-6120', name: 'Kwame Darkwa' }]);
    component.customersLoaded.set(true);

    expect(component.offerableCustomers().map(candidate => candidate.customerId)).toEqual(['hcp-6120']);

    // And an id the api never offered cannot be added, however it reaches the control's value.
    component.planCustomerChoice = 'a14';
    component.addCustomer();
    expect(component.chosenCustomers()).toHaveLength(0);
  });

  /** A care angel is an account on hc-patient's stack and is not a patient — `dl-angel` in the seed. */
  it('does not offer a care angel', () => {
    component.customers.set([{ customerId: 'hcp-6120', name: 'Kwame Darkwa' }]);
    component.customersLoaded.set(true);

    component.planCustomerChoice = 'kojo.sarsah@mail.gh';
    component.addCustomer();

    expect(component.chosenCustomers()).toHaveLength(0);
    expect(component.offerableCustomers().map(candidate => candidate.name)).not.toContain('kojo.sarsah@mail.gh');
  });

  /** Somebody hc-patient has erased — `dl-erased` in the seed — is never a visit on a clinician's day. */
  it('does not offer an erased subject', () => {
    component.customers.set([{ customerId: 'hcp-6120', name: 'Kwame Darkwa' }]);
    component.customersLoaded.set(true);

    component.planCustomerChoice = 'hcp-0000';
    component.addCustomer();
    component.planRound();

    expect(component.chosenCustomers()).toHaveLength(0);
    expect(planned[0].rounds[0].visits).toEqual([]);
  });

  /**
   * The screen says why a patient may not be listed.
   *
   * <p>A picker that silently omits nine of fifteen patients is its own defect: the reader cannot see
   * the directory from this panel, so "some are missing" is not something they can infer from a short
   * list. Read out of the template and out of the catalogue, because a signal asserted on the
   * component would pass against a panel that rendered nothing.
   */
  it('explains on screen that not every patient can be listed', () => {
    expect(template).toContain('data-cy="planCustomersPartial"');
    expect(template).toContain('dutyRoster.plan.customersPartial');

    const words = JSON.parse(readFileSync('src/main/webapp/i18n/en/dutyRoster.json', 'utf8')).dutyRoster.plan.customersPartial;
    expect(words).toContain('not listed');
    expect(words).toContain('no id to send');

    // Shown once the list has been answered for, and not while it is in flight or after it failed —
    // those have their own sentences, and three explanations on one control explain nothing.
    expect(component.showsPartialCoverage()).toBe(false);
    component.customersLoaded.set(true);
    expect(component.showsPartialCoverage()).toBe(true);
    component.customersFailed.set(true);
    expect(component.showsPartialCoverage()).toBe(false);
  });

  /**
   * A row nothing can name is labelled in words, never by its id.
   *
   * <p>Item 45's rule at the one place this screen renders a person. The api sends `null` for such a
   * row — `a13` and `a15` in the seed have no `Profile` — and the option shows the catalogue's
   * words. Asserted on the template, because the fallback is a template expression.
   */
  it('labels an unnameable patient in words rather than by an id', () => {
    expect(template).toContain("customer.name ?? ('dutyRoster.plan.unidentified' | translate)");
    // The name is the label and the id is the value, and never the other way round.
    expect(template).toContain('<option [value]="customer.customerId">');
    expect(template).not.toContain('{{ customer.customerId }}');
  });

  /** A patient already on the round is not offered again — hc-professional refuses overlapping visits. */
  it('stops a patient being added to the same round twice', () => {
    component.customers.set([
      { customerId: 'hcp-6120', name: 'Kwame Darkwa' },
      { customerId: 'hcp-8814', name: 'naa.adjeley@mail.gh' },
    ]);

    component.planCustomerChoice = 'hcp-6120';
    component.addCustomer();
    expect(component.offerableCustomers().map(candidate => candidate.customerId)).toEqual(['hcp-8814']);

    component.planCustomerChoice = 'hcp-6120';
    component.addCustomer();
    expect(component.chosenCustomers()).toHaveLength(1);
  });

  /** Taking a patient off the round moves the visits after them an hour earlier, which is the intent. */
  it('closes the gap when a patient is removed', () => {
    component.planShift = 'DAY';
    component.chosenCustomers.set([
      { customerId: 'hcp-1', name: 'First' },
      { customerId: 'hcp-2', name: 'Second' },
      { customerId: 'hcp-3', name: 'Third' },
    ]);

    component.removeCustomer('hcp-1');
    component.planRound();

    expect(planned[0].rounds[0].visits).toEqual([
      { customerId: 'hcp-2', startTime: '08:00', endTime: '09:00' },
      { customerId: 'hcp-3', startTime: '09:00', endTime: '10:00' },
    ]);
  });

  /**
   * An empty list that has not loaded, one that failed and one that is genuinely empty are three
   * states, and the panel keeps them apart.
   *
   * <p>Collapsing them is how a picker lies: a dropdown showing nothing while a request is in flight
   * reads as "no patient can be planned for", which is the plausible-wrong-state item 22 exists to
   * keep off this screen.
   */
  it('tells an unloaded patient list from a failed one and from an empty one', () => {
    expect(component.customersLoaded()).toBe(false);
    expect(component.customersFailed()).toBe(false);

    (component as any).rosterPlanService.customers = () => ({
      subscribe: ({ error }: { error: (reason: unknown) => void }): void => error(new Error('nope')),
    });
    component.openPlanner();

    expect(component.customersFailed()).toBe(true);
    expect(component.customersLoaded()).toBe(false);
    expect(component.customers()).toEqual([]);
    expect(template).toContain('data-cy="planCustomersFailed"');
  });

  /** A round with no visits is valid — ward cover and on-call time are real shifts. */
  it('still plans a round with nobody on it', () => {
    component.planRound();

    expect(planned).toHaveLength(1);
    expect(planned[0].rounds[0].visits).toEqual([]);
  });
});
