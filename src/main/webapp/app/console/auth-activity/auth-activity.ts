import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';

import dayjs from 'dayjs/esm';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { TranslatePipe } from '@ngx-translate/core';

import { AbfChartCard, AbfLineChart, AbfStackedBar, LinePoint, StackSegment, VIZ_SERIES } from 'app/shared/viz';
import { TranslateDirective } from 'app/shared/language';

import { AuthActivity, AuthActivityService, RegistrationTotals } from '../shared/auth-activity.service';

/**
 * Sign-in and registrations — backlog item 75.
 *
 * <h2>Two figures, two populations, and the screen's first job is not to blur them</h2>
 *
 * The item asked for "registrations aggregated by activated / not-activated" and "logins aggregated
 * by success / failed". Answering it needed a decision the item did not contain, because
 * **hc-admin-gateway has no registrations**: `/api/register` and `/api/activate` were removed, and
 * accounts here are created by an administrator through `/api/admin/users`. So "registrations" is
 * two different features:
 *
 * - **Across BridgeCare** — patients, care angels and clinicians who registered on hc-patient and
 *   hc-professional, arriving here as domain events and counted from `directory_link`. This is what
 *   an operator means, and it is the headline.
 * - **On this gateway** — console staff accounts. A much smaller and duller number, and one that
 *   answers a real operational question of its own (who can get into the console, and how many of
 *   those have never signed in).
 *
 * Both are shown, and **the scope of each is stated on the card in words rather than left to a
 * heading**. Without that, the staff figure reads as the platform's user count and looks alarmingly
 * small — a screen inviting exactly one misreading is worse than a screen missing a number.
 * `auth-activity.spec.ts` asserts each scope sentence is rendered, because a card whose title
 * survives a translation edit and whose explanation does not is the same defect back.
 *
 * <h2>⚠ The registrations chart has three segments and must keep them</h2>
 *
 * `notReported` is not "not activated". A clinician known only from an `onboarding.state` frame has
 * no answer to the question — `DirectoryLink.activated` is nullable for that reason, and its javadoc
 * records the previous version of this mistake in the api. Merging the two here would put the defect
 * back on the screen rather than in the query, where nothing server-side would catch it.
 *
 * <h2>Charts are the hand-written SVG components</h2>
 *
 * `abf-stacked-bar` and `abf-line-chart` over `viz-palette`. There is no charting library in this
 * repository and none is to be added; both charts sit inside `abf-chart-card`, which supplies the
 * Chart/Table toggle every chart here has — two of the three series colours are lighter than the
 * first, and the table is how their values stay readable to anyone the colour separation does not
 * serve.
 */
@Component({
  selector: 'abf-auth-activity',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './auth-activity.html',
  styleUrl: './auth-activity.scss',
  imports: [FontAwesomeModule, TranslateDirective, TranslatePipe, AbfChartCard, AbfLineChart, AbfStackedBar],
})
export default class AuthActivityScreen implements OnInit {
  readonly registrations = signal<RegistrationTotals | null>(null);
  readonly activity = signal<AuthActivity | null>(null);

  readonly isLoading = signal(false);

  /**
   * One message per half, not one for the screen.
   *
   * The two halves come from two different services (see `AuthActivityService`), so one being down
   * is a partial answer rather than a broken screen — and a single error banner over an empty page
   * would say the console was broken when in fact one of two backends was. Each card reports its own
   * absence where the figure would have been.
   */
  readonly registrationsError = signal<string | null>(null);
  readonly activityError = signal<string | null>(null);

  /** The estate-wide split, as the three segments of one bar. */
  readonly registrationSegments = computed<StackSegment[]>(() => {
    const totals = this.registrations();
    if (!totals) {
      return [];
    }
    return [
      { key: 'activated', label: 'Activated', value: totals.activated },
      { key: 'notActivated', label: 'Not activated', value: totals.notActivated },
      { key: 'notReported', label: 'Not reported', value: totals.notReported },
    ];
  });

  /** The palette, exposed so the legend swatches and the bar cannot drift apart. */
  readonly seriesColours = VIZ_SERIES;

  /**
   * Failed sign-ins per day across the window.
   *
   * Failures rather than both series: `abf-line-chart` draws one line, and the question this screen
   * exists to answer is whether failures are unusual today. The successes are on the card above it
   * as a total, and the daily figures for both are in the chart card's table view — so nothing is
   * hidden, it is just not the line.
   */
  readonly failedByDay = computed<LinePoint[]>(() =>
    (this.activity()?.logins.daily ?? []).map(point => ({ label: dayjs(point.day).format('D MMM'), value: point.failed })),
  );

  /**
   * What share of attempts in the window failed.
   *
   * A rate rather than a raw count, because a raw count answers nothing on its own — twenty failures
   * is an ordinary afternoon on a busy console and an incident on a quiet one. Null rather than 0%
   * when nothing has been attempted at all: "0% of nothing failed" is a reassuring way of saying
   * there is no data.
   */
  readonly failureRate = computed<number | null>(() => {
    const logins = this.activity()?.logins;
    if (!logins) {
      return null;
    }
    const attempts = logins.succeeded + logins.failed;
    return attempts === 0 ? null : Math.round((logins.failed / attempts) * 100);
  });

  // Declared after the public members, which is what `@typescript-eslint/member-ordering` wants here
  // and not the injection-at-the-top habit the generated screens read as.
  private readonly authActivityService = inject(AuthActivityService);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.isLoading.set(true);
    this.registrationsError.set(null);
    this.activityError.set(null);

    this.authActivityService.registrations().subscribe({
      next: totals => this.registrations.set(totals),
      error: (error: HttpErrorResponse) => this.registrationsError.set(this.describe(error)),
    });

    this.authActivityService.authActivity().subscribe({
      next: activity => {
        this.activity.set(activity);
        this.isLoading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.activityError.set(this.describe(error));
        this.isLoading.set(false);
      },
    });
  }

  /**
   * A message a reader can act on, and the 403 case is the one worth having.
   *
   * The sign-in half is `ROLE_ADMIN` alone on the gateway — narrower than everything else on this
   * console — so an operator who reaches this screen by URL gets a 403 for one card and a perfectly
   * good answer for the other. "Something went wrong" would send them looking for an outage.
   */
  private describe(error: HttpErrorResponse): string {
    return error.status === 403 ? 'authActivity.error.forbidden' : 'authActivity.error.unavailable';
  }
}
