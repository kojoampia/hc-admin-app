import { beforeEach, describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { HttpRequest, provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { FaIconLibrary } from '@fortawesome/angular-fontawesome';

import { fontAwesomeIcons } from 'app/config/font-awesome-icons';

import Dashboard from './dashboard';

/**
 * The pending-approval card, which is a capped list and therefore also a promise.
 *
 * <p>It rendered every pending record until item 11 — 28 of them on seeded data, three screens of
 * dashboard hanging below a hero about the week. Capping it is half a fix on its own: a list that
 * shows five of sixteen and says nothing about the other eleven is the pagination failure
 * `CLAUDE.md` documents, worse than the unbounded read because it looks complete.
 *
 * <p>So what is asserted here is the pair. The card shows five rows; the count of what it is not
 * showing is a real number taken from `X-Total-Count` rather than from the rows that arrived; and
 * every directory holding some of them is linked with its own filter.
 */
describe('dashboard approvals', () => {
  let component: Dashboard;
  let httpMock: HttpTestingController;

  /** One page of pending records from a directory, with its true total on the header. */
  const answer = (fragment: string, body: unknown[], total: number): HttpRequest<unknown> => {
    const request = httpMock.expectOne(pending(fragment));
    request.flush(body, { headers: { 'X-Total-Count': String(total) } });
    return request.request;
  };

  const pending =
    (fragment: string) =>
    (request: HttpRequest<unknown>): boolean =>
      request.url.includes(fragment) && request.params.get('status.equals') === 'PENDING';

  const patient = (id: string): unknown => ({ id, profile: { firstName: 'Ama', lastName: 'Boateng' } });
  const professional = (id: string): unknown => ({ id, profile: { firstName: 'Kwesi', lastName: 'Owusu' } });
  const vendor = (id: string): unknown => ({ id, name: 'Accra Medical Supplies' });

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]), provideTranslateService()],
    });
    component = TestBed.runInInjectionContext(() => new Dashboard());
    httpMock = TestBed.inject(HttpTestingController);
    component.ngOnInit();
  });

  it('shows five rows and counts the rest from the header, not from the rows', () => {
    answer('patients', [patient('p1'), patient('p2'), patient('p3'), patient('p4'), patient('p5')], 12);
    answer('professionals', [professional('r1'), professional('r2')], 4);
    answer('vendors', [], 0);

    expect(component.approvals().length).toBe(5);
    // 16 pending, 5 on the card. Counted from the totals: the page it received held seven.
    expect(component.hiddenApprovals()).toBe(11);
  });

  /**
   * The request is the size of the card.
   *
   * <p>It asked each directory for 20 and rendered all sixty. Asking for five and slicing to five
   * would have fixed the screen and left the three requests oversized for no reader.
   */
  it('asks each directory for one page the size of the card', () => {
    const request = answer('patients', [], 0);
    answer('professionals', [], 0);
    answer('vendors', [], 0);

    expect(request.params.get('size')).toBe('5');
  });

  /** Every directory with something hidden is reachable, filtered to what was hidden. */
  it('links each directory that has pending records, and only those', () => {
    answer('patients', [patient('p1')], 3);
    answer('professionals', [], 0);
    answer('vendors', [vendor('v1')], 2);

    expect(component.approvalOverflow().map(group => group.kind)).toEqual(['patient', 'vendor']);
    expect(component.approvalOverflow().map(group => group.count)).toEqual([3, 2]);
    expect(component.approvalOverflow().map(group => group.route)).toEqual(['/patient', '/vendor']);
  });

  /** Nothing waiting is the empty state, not a footer saying "and 0 more". */
  it('offers no overflow when the card is showing everything', () => {
    answer('patients', [patient('p1')], 1);
    answer('professionals', [professional('r1')], 1);
    answer('vendors', [], 0);

    expect(component.approvals().length).toBe(2);
    expect(component.hiddenApprovals()).toBe(0);
  });

  /**
   * **A patient learned from a sibling event reaches this card, and reached it as a blank row.**
   *
   * `DirectoryProjectionService` opens such a patient as `PENDING` unless the stream says the
   * account is activated, and `PENDING` is exactly what this card queries. That patient has no
   * `Profile` and can never be given one from the wire — the streams carry no name — so `name` is
   * the join of two absent fields, `''`, and `initials('')` was `''` too: an empty avatar beside an
   * empty title, on the first card an administrator looks at, linking somewhere.
   *
   * The row is not resolved against the `DirectoryLink` the way the patient directory resolves it,
   * and that is argued in `isUnnamed`'s javadoc: this card says *what is waiting*, the record it
   * links to says *who*. What item 45 asks for is that an incomplete record reads as incomplete
   * rather than as corrupt, and a row that cannot be seen at all fails that harder than an ObjectId
   * does.
   */
  it('marks a pending record that nothing here can name, rather than drawing an empty row', () => {
    answer('patients', [{ id: '68b4f2a19c3d5e7f81a02c44' }], 1);
    answer('professionals', [], 0);
    answer('vendors', [], 0);

    const [row] = component.approvals();
    expect(component.isUnnamed(row)).toBe(true);
    // Never the id, here either — the same rule as the directory it links to.
    expect(component.initials(row.name)).not.toBe('68');
    expect(component.initials(row.name)).toBe('—');
    expect(row.route).toBe('/patient/68b4f2a19c3d5e7f81a02c44/view');
  });

  it('leaves a named record alone', () => {
    answer('patients', [patient('p1')], 1);
    answer('professionals', [], 0);
    answer('vendors', [], 0);

    const [row] = component.approvals();
    expect(component.isUnnamed(row)).toBe(false);
    expect(component.initials(row.name)).toBe('AB');
  });

  /**
   * A directory that fails must not leave the previous session's rows on the card.
   *
   * <p>The three are one `forkJoin`, so the first failure cancels its siblings — there is nothing
   * to flush after it, and a partial card is not a state this can reach.
   */
  it('empties the card when a directory cannot be read', () => {
    httpMock.expectOne(pending('patients')).error(new ProgressEvent('network'));

    expect(component.approvals()).toEqual([]);
    expect(component.hiddenApprovals()).toBe(0);
    expect(component.approvalOverflow()).toEqual([]);
  });
});

/**
 * The same card, in a real DOM — which is a different question and the one that went red.
 *
 * <p>Everything above reads the component's signals, and every assertion in it was correct and
 * passing on the day `main` went red on `dashboard.cy.ts` with **"Too many elements found. Found
 * '6', expected 5"** against `[data-cy="approvals"] .lrow`. Signals cannot see that, because the
 * collision is in the markup: the overflow indicator is a `<div class="lrow more">`, sharing the
 * class with the rows for its styling (`.lrow.more` in `dashboard.scss`). Five rows plus one
 * indicator is six `.lrow`, and `setApprovals()` slices to `APPROVAL_ROWS`, so a sixth row is not a
 * state this card can reach at all. Backlog item 67.
 *
 * <p>**The seed was blamed, and the seed was right.** Item 52 added a sixth PENDING account, which
 * made `hiddenApprovals()` non-zero for the first time on any stack and put the indicator on the
 * screen — so a correct fixture change surfaced a selector that had always been wrong and had never
 * had anything to over-select. The lesson generalises past this card: a class says how something
 * looks, a `data-cy` says what it is, and a count of the first is a count of whatever is dressed
 * alike.
 *
 * <p>This costs a full `TestBed.createComponent` where the rest of the file constructs the
 * component directly, which is why it is a separate block rather than folded in above. It is worth
 * it once: nothing cheaper can see a rendering collision, and the Cypress gate that could see it
 * cannot be run outside CI.
 */
describe('dashboard approvals, as rendered', () => {
  let httpMock: HttpTestingController;

  const pending =
    (fragment: string) =>
    (request: HttpRequest<unknown>): boolean =>
      request.url.includes(fragment) && request.params.get('status.equals') === 'PENDING';

  const patient = (id: string): unknown => ({ id, profile: { firstName: 'Ama', lastName: 'Boateng' } });

  /**
   * Renders the dashboard with more pending accounts than the card has rows, and hands back the
   * approvals card.
   *
   * <p>Six patients on one page against a total of nine, no professionals, two vendors: five rows
   * shown, six hidden, and two directories to link. Deliberately lopsided — with the same count in
   * each directory a wrong total and a right one would render the same digits.
   */
  const cardInOverflow = (): HTMLElement => {
    const fixture = TestBed.createComponent(Dashboard);
    fixture.detectChanges();

    httpMock
      .expectOne(pending('patients'))
      .flush([patient('a1'), patient('a2'), patient('a3'), patient('a4'), patient('a5'), patient('a6')], {
        headers: { 'X-Total-Count': '9' },
      });
    httpMock.expectOne(pending('professionals')).flush([], { headers: { 'X-Total-Count': '0' } });
    httpMock.expectOne(pending('vendors')).flush([], { headers: { 'X-Total-Count': '2' } });

    fixture.detectChanges();
    return fixture.nativeElement.querySelector('[data-cy="approvals"]') as HTMLElement;
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]), provideTranslateService()],
    });
    // The template renders `fa-icon` in the approvals empty state and throughout the rest of the
    // dashboard; an unregistered icon is a thrown error rather than a blank, so the whole library
    // goes in rather than the handful this block happens to reach.
    TestBed.inject(FaIconLibrary).addIcons(...fontAwesomeIcons);
    httpMock = TestBed.inject(HttpTestingController);
  });

  /**
   * The assertion the Cypress case makes, at a hundredth of the cost.
   *
   * <p>Both numbers are pinned on purpose. The five is the claim; the six is the *reason the claim
   * needs a `data-cy`, and it is what a reader will otherwise undo. If this case ever fails on the
   * six alone — because the indicator stopped carrying `.lrow` — the collision is gone and this
   * case can go with it. Do not "fix" it by loosening the selector back to the class.
   */
  it('distinguishes an approval row from the overflow indicator that shares its class', () => {
    const card = cardInOverflow();

    expect(card.querySelectorAll('[data-cy="approvalRow"]')).toHaveLength(5);
    expect(card.querySelectorAll('.lrow')).toHaveLength(6);
    expect(card.querySelector('[data-cy="approvalsOverflow"]')?.classList.contains('lrow')).toBe(true);
  });

  /**
   * The footer renders, and each link carries the count of what is at the other end of it.
   *
   * <p>The two numbers on that footer are different and are meant to be: "and N more waiting" is
   * `pending − shown`, while a directory button carries that directory's whole pending total,
   * because the button navigates to `?status=PENDING` and its count is what the reader finds on
   * arrival. Only the second is assertable here — `TranslateService` has no catalogue loaded in a
   * unit test, so `| translate` returns the key and the interpolated copy exists only against a
   * real stack. `dashboard.cy.ts` asserts that half.
   */
  it('links each directory with pending records, carrying that directory’s own total', () => {
    const overflow = cardInOverflow().querySelector('[data-cy="approvalsOverflow"]')!;
    const links = Array.from(overflow.querySelectorAll('a')).map(link => [link.getAttribute('href'), link.textContent.trim()]);

    // The professional directory has none pending and is deliberately absent: a link promising
    // nought more is worse than no link.
    expect(links).toEqual([
      ['/patient?status=PENDING', expect.stringContaining('9')],
      ['/vendor?status=PENDING', expect.stringContaining('2')],
    ]);
  });
});
