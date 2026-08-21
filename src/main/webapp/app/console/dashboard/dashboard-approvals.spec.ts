import { beforeEach, describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { HttpRequest, provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';

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
