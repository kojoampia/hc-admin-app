import { readFileSync } from 'node:fs';

import { beforeEach, describe, expect, it } from 'vitest';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { faSync } from '@fortawesome/free-solid-svg-icons';

import { AuthActivity, RegistrationTotals } from '../shared/auth-activity.service';
import AuthActivityScreen from './auth-activity';

/**
 * The sign-in and registrations screen — backlog item 75.
 *
 * <h2>What these cases are actually protecting</h2>
 *
 * Two of them are about arithmetic and the rest are about a screen being read correctly, which on
 * this screen is the harder half. It shows two numbers that both sound like "registrations" and are
 * three orders of magnitude apart, and it shows a three-way split where the item that asked for it
 * asked for two. Both invite one specific misreading each, and neither misreading is visible to a
 * test that only checks the figures.
 */
describe('the sign-in and registrations screen', () => {
  /**
   * Read once, from a path relative to the **repository root**.
   *
   * Not `join(__dirname, …)`, which is what this file used until it was measured: under the Angular
   * Vitest builder `__dirname` is the app root rather than the spec's own directory, so that form
   * looked for `app/auth-activity.html` and threw `ENOENT` in all four template cases. Vitest's cwd
   * **is** the app root, so a literal path from there resolves — and it is what every other
   * file-reading spec here already does: `login.spec.ts`, `duty-roster.spec.ts`,
   * `roster-week-update.spec.ts`, `record-identity.spec.ts` and `branding.spec.ts` are unanimous,
   * and this file was the only `__dirname` in the repository.
   */
  const template = readFileSync('src/main/webapp/app/console/auth-activity/auth-activity.html', 'utf8');

  let component: AuthActivityScreen;
  let httpMock: HttpTestingController;

  const registrations = (activated: number, notActivated: number, notReported: number): RegistrationTotals => ({
    activated,
    notActivated,
    notReported,
    total: activated + notActivated + notReported,
    bySource: [
      { source: 'HC_PATIENT', activated, notActivated, notReported: 0, total: activated + notActivated },
      { source: 'HC_PROFESSIONAL', activated: 0, notActivated: 0, notReported, total: notReported },
    ],
  });

  const activity = (succeeded: number, failed: number): AuthActivity => ({
    accounts: { activated: 3, notActivated: 1 },
    logins: {
      succeeded,
      failed,
      daily: [
        { day: '2026-09-09', succeeded: 1, failed: 0 },
        { day: '2026-09-10', succeeded: succeeded - 1, failed },
      ],
      topFailedLogins: failed > 0 ? [{ login: 'ADMIN', failures: failed }] : [],
    },
    windowDays: 30,
    retentionDays: 90,
  });

  const answerBoth = (totals: RegistrationTotals, data: AuthActivity): void => {
    httpMock.expectOne(request => request.url.includes('directory-links/registrations')).flush(totals);
    httpMock.expectOne(request => request.url.endsWith('api/auth-activity')).flush(data);
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuthActivityScreen],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]), provideTranslateService()],
    }).compileComponents();

    // The template renders the refresh button's icon, and FaIconComponent throws on an icon the
    // library does not hold — so without this every case here fails during change detection, naming
    // the icon and not the case.
    TestBed.inject(FaIconLibrary).addIcons(faSync);

    const fixture = TestBed.createComponent(AuthActivityScreen);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  // --- the two endpoints, and that they are two ------------------------------------------------

  /**
   * The two halves come from two different services, and each is addressed the way its owner is
   * reached.
   *
   * hc-admin-gateway owns `login_attempt` and `jhi_user` and is the only thing that can see a sign-in
   * attempt; hc-admin-service owns `directory_link`. Neither can answer the other's question — the api
   * runs `skipUserManagement: true` and has no route to the gateway's users.
   *
   * **The microservice segment is the whole case.** `ConsoleMetricsService` records the inverse
   * mistake next door: a gateway-relative call to an api endpoint 404ing in production with no screen
   * reporting it. Getting it backwards here fails exactly as quietly.
   */
  it('asks the gateway for sign-ins and the admin service for registrations', () => {
    const authActivity = httpMock.expectOne(request => request.url.endsWith('api/auth-activity'));
    expect(authActivity.request.url).not.toContain('services/');

    const totals = httpMock.expectOne(request => request.url.includes('directory-links/registrations'));
    expect(totals.request.url).toContain('services/hcadminservice/');
  });

  // --- the three buckets ------------------------------------------------------------------------

  /**
   * **The defect item 75 warned about, as a test.** "Not reported" is a third state and must reach
   * the chart as a third segment.
   *
   * `DirectoryLink.activated` is nullable because a clinician known only from an `onboarding.state`
   * frame has told this estate nothing either way, and its javadoc records the api having conflated
   * the two once already. Merge them on the client and every server-side guard stays green.
   */
  it('draws three segments and keeps not-reported out of not-activated', () => {
    answerBoth(registrations(10, 2, 7), activity(5, 0));

    const segments = component.registrationSegments();

    expect(segments.map(segment => segment.key)).toEqual(['activated', 'notActivated', 'notReported']);
    expect(segments.map(segment => segment.value)).toEqual([10, 2, 7]);
  });

  /**
   * And the segments sum to the total the server sent, rather than to one computed here.
   *
   * A chart whose parts do not add up to the number printed beside them is a defect this estate's
   * dashboard has had twice. The server carries `total` for exactly this reason, so a dropped bucket
   * is visible instead of arithmetically invisible.
   */
  it('has segments that sum to the total the server reported', () => {
    answerBoth(registrations(10, 2, 7), activity(5, 0));

    const summed = component.registrationSegments().reduce((running, segment) => running + segment.value, 0);
    expect(summed).toBe(component.registrations()!.total);
  });

  // --- the failure rate -------------------------------------------------------------------------

  it('reports the share of attempts that failed', () => {
    answerBoth(registrations(1, 0, 0), activity(6, 2));

    expect(component.failureRate()).toBe(25);
  });

  /**
   * Nothing attempted is null, not zero.
   *
   * "0% of attempts failed" is a reassuring sentence about a window in which nothing happened, and on
   * a security screen a reassuring sentence with no data behind it is the worst of the three possible
   * answers. The template renders a dash.
   */
  it('says nothing rather than 0% when there were no attempts at all', () => {
    answerBoth(registrations(1, 0, 0), activity(0, 0));

    expect(component.failureRate()).toBeNull();
  });

  // --- one endpoint failing is not a broken screen -----------------------------------------------

  /**
   * Each half reports its own absence.
   *
   * A single banner over an empty page would say the console was broken when in fact one of two
   * backends was — and the likeliest cause is not an outage at all: the sign-in half is
   * `ROLE_ADMIN` alone on the gateway, so a 403 is a real and correct answer for a caller the other
   * half serves perfectly well.
   */
  it('keeps the registration figures when the gateway refuses the sign-in figures', () => {
    httpMock.expectOne(request => request.url.includes('directory-links/registrations')).flush(registrations(10, 2, 7));
    httpMock.expectOne(request => request.url.endsWith('api/auth-activity')).flush(null, { status: 403, statusText: 'Forbidden' });

    expect(component.registrations()?.total).toBe(19);
    expect(component.activityError()).toBe('authActivity.error.forbidden');
    expect(component.registrationsError()).toBeNull();
  });

  it('distinguishes a refusal from an outage', () => {
    httpMock.expectOne(request => request.url.includes('directory-links/registrations')).flush(registrations(1, 0, 0));
    httpMock
      .expectOne(request => request.url.endsWith('api/auth-activity'))
      .flush(null, { status: 500, statusText: 'Internal Server Error' });

    expect(component.activityError()).toBe('authActivity.error.unavailable');
  });

  // --- the template says which figure is which ---------------------------------------------------

  /**
   * **The scope sentences are load-bearing and are asserted, not trusted.**
   *
   * This screen shows two numbers that both sound like "registrations": the estate's, in the
   * thousands eventually, and the console's own staff accounts, which will be about six. Without a
   * sentence on each card saying which population it counts, the staff figure reads as the platform's
   * user count and looks alarmingly small — a screen inviting exactly one misreading is worse than a
   * screen missing a number.
   *
   * Read from the template rather than from a rendered fixture on purpose: these are the anchors a
   * later tidy-up removes, and a rendering assertion would also pass if the element were present and
   * empty.
   */
  it('states the scope of each figure on the card that shows it', () => {
    expect(template).toContain('data-cy="registrationsScope"');
    expect(template).toContain('data-cy="staffScope"');
    expect(template).toContain('authActivity.registrations.scope');
    expect(template).toContain('authActivity.staff.scope');
  });

  /**
   * And it says out loud that "not reported" is not "not activated".
   *
   * The chart's own legend cannot carry this: three labelled segments still read as
   * activated-or-not-plus-something-odd, and the reader's guess for the odd one is "not activated".
   */
  it('explains on screen that not-reported is a third state', () => {
    expect(template).toContain('data-cy="notReportedNote"');
    expect(template).toContain('authActivity.registrations.notReportedNote');
  });

  /**
   * And it says what the failed-login column is, where the column is.
   *
   * Those values are logins exactly as they were typed, which on a failure is usually not the account
   * holder. An administrator reading that table as a list of colleagues who forgot their password
   * would draw the wrong conclusion about every row in it.
   */
  it('says the failed logins are attempts rather than people', () => {
    expect(template).toContain('data-cy="failedLoginsScope"');
    expect(template).toContain('authActivity.failedLogins.scope');
  });

  /**
   * The window and the retention are rendered from the payload, never written into the copy.
   *
   * `Uptime(percent, windowDays)` set this convention on the api's dashboard after a card claiming a
   * 30-day figure was computed over 15 days of retention. A hardcoded "last 30 days" here would be
   * the same defect: the two are configurable and independent, and a caption that cannot follow them
   * is a caption that will eventually be wrong with nothing to say so.
   */
  it('renders the window and the retention from the response rather than from the copy', () => {
    expect(template).toContain('days: data.windowDays');
    expect(template).toContain('days: data.retentionDays');
    expect(template).not.toMatch(/last 30 days/i);
  });
});
