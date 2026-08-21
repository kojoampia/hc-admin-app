import { beforeEach, describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { HttpRequest, provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';

import MessageDesk from './message-desk';

/**
 * The desk's filters, which are query parameters and not a view over a page.
 *
 * <p>Item 19: the desk offered priority chips alone while channel and status were both columns it
 * showed. Status arrived with the counter tiles; channel is the last dimension, and the thing worth
 * asserting about it is the parameter name — `MessageResource` declares `channel.equals`, and a
 * client sending anything else gets the unfiltered collection back with no error anywhere, which
 * reads as a filter that matched everything.
 */
describe('message desk filters', () => {
  let component: MessageDesk;
  let httpMock: HttpTestingController;

  /** The most recent list request, ignoring the three one-row counter queries. */
  const lastList = (): HttpRequest<unknown> => {
    const requests = httpMock.match(
      (request: HttpRequest<unknown>) => request.url.includes('messages') && request.params.get('size') !== '1',
    );
    expect(requests.length).toBeGreaterThan(0);
    const last = requests[requests.length - 1];
    requests.forEach(request => request.flush([], { headers: { 'X-Total-Count': '0' } }));
    return last.request;
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]), provideTranslateService()],
    });
    component = TestBed.runInInjectionContext(() => new MessageDesk());
    httpMock = TestBed.inject(HttpTestingController);
  });

  it('sends a channel chip as the parameter the api declares', () => {
    component.toggleChip('channel', 'EMAIL');

    expect(lastList().params.get('channel.equals')).toBe('EMAIL');
  });

  /** Three independent dimensions, not one chip row: choosing a channel must not clear a status. */
  it('keeps a status filter when a channel is chosen', () => {
    component.toggleChip('status', 'NEW');
    component.toggleChip('channel', 'VENDOR_PORTAL');

    const request = lastList();
    expect(request.params.get('status.equals')).toBe('NEW');
    expect(request.params.get('channel.equals')).toBe('VENDOR_PORTAL');
  });

  /** One value per dimension: a second channel replaces the first rather than matching neither. */
  it('replaces the channel rather than intersecting two of them', () => {
    component.toggleChip('channel', 'EMAIL');
    component.toggleChip('channel', 'PATIENT_APP');

    expect(lastList().params.getAll('channel.equals')).toEqual(['PATIENT_APP']);
  });

  it('drops the parameter when the chip is toggled off', () => {
    component.toggleChip('channel', 'EMAIL');
    component.toggleChip('channel', 'EMAIL');

    expect(lastList().params.get('channel.equals')).toBeNull();
  });

  /**
   * The applied-chip row reads its label from the dictionary of its own dimension.
   *
   * <p>Everything was translated as `console.status.<value>`, which held while the dimensions were
   * status and priority. A channel has its own dictionary, and a missing key renders as the key —
   * `console.status.VENDOR_PORTAL` printed on a chip.
   */
  it('labels a channel chip from the channel dictionary', () => {
    expect(component.chipLabel({ kind: 'channel', value: 'VENDOR_PORTAL' })).toBe('console.channel.VENDOR_PORTAL');
    expect(component.chipLabel({ kind: 'status', value: 'NEW' })).toBe('console.status.NEW');
  });
});
