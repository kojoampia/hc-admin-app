import { beforeEach, describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { HttpRequest, provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';

import DeletionRequests from './deletion-requests';
import { DeletionRequest } from './deletion-request.service';

const DAY = 24 * 60 * 60 * 1000;

/**
 * The one console screen that destroys data.
 *
 * <p>Most of this file is about the confirmation, and that is the right proportion. Completing a
 * request erases a patient across sixteen collections with no undo anywhere in the platform, and
 * the thing standing between an administrator and the wrong row is a typed patient id.</p>
 */
describe('deletion request queue', () => {
  let component: DeletionRequests;
  let httpMock: HttpTestingController;

  const request = (over: Partial<DeletionRequest> = {}): DeletionRequest => ({
    id: 'req-1',
    patientId: 'ama-patient',
    requestedByEmail: 'ama@example.test',
    status: 'PENDING',
    requestedAt: new Date(Date.now() - 2 * DAY).toISOString(),
    dueAt: new Date(Date.now() + 12 * DAY).toISOString(),
    ...over,
  });

  const answer = (rows: DeletionRequest[]): void => {
    httpMock
      .match((req: HttpRequest<unknown>) => req.url.includes('deletion-requests') && req.method === 'GET')
      .forEach(req => req.flush(rows));
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]), provideTranslateService()],
    });
    // Constructed rather than rendered, as every other console spec does it. Rendering would need
    // the FontAwesome library registered in the test setup, which it is not — and none of these
    // assertions are about the template.
    component = TestBed.runInInjectionContext(() => new DeletionRequests());
    httpMock = TestBed.inject(HttpTestingController);
    component.ngOnInit();
  });

  it('asks the patient service, not this stack', () => {
    // The request lives with the clinical data it commissions the erasure of, which is hc-patient's.
    // This is the call that needs a /services/hcpatientservice route on the admin gateway.
    const found = httpMock.match((req: HttpRequest<unknown>) => req.url.includes('hcpatientservice/api/deletion-requests'));
    expect(found.length).toBe(1);
    found.forEach(req => req.flush([]));
  });

  it('opens on what is still owed', () => {
    const found = httpMock.match((req: HttpRequest<unknown>) => req.url.includes('deletion-requests'));
    expect(found[0].request.params.get('status')).toBe('PENDING');
    found.forEach(req => req.flush([]));
  });

  it('refuses to erase until the patient id is typed exactly', () => {
    answer([request()]);
    const row = component.rows()[0];
    component.startAction(row);

    component.confirmId.set('ama-patien');
    expect(component.confirmMatches(row)).toBe(false);
    component.complete(row);
    httpMock.expectNone((req: HttpRequest<unknown>) => req.method === 'POST');

    // Case-sensitive: a patient id is machine-generated, so there is no keyboard to blame, and a
    // check that accepts a near-miss is not a check.
    component.confirmId.set('AMA-PATIENT');
    expect(component.confirmMatches(row)).toBe(false);

    component.confirmId.set('  ama-patient  ');
    expect(component.confirmMatches(row)).toBe(true);
  });

  it('erases only once the id matches', () => {
    answer([request()]);
    const row = component.rows()[0];
    component.startAction(row);
    component.confirmId.set('ama-patient');

    component.complete(row);

    const posted = httpMock.expectOne((req: HttpRequest<unknown>) => req.url.endsWith('/req-1/complete'));
    expect(posted.request.method).toBe('POST');
    posted.flush(request({ status: 'COMPLETED' }));
    answer([]);
  });

  it('leaves the request pending when the erasure fails', () => {
    // PatientErasureService is safe to re-run, which is why a failure is a job still on the queue
    // rather than a state to repair. The screen must not imply otherwise.
    answer([request()]);
    const row = component.rows()[0];
    component.startAction(row);
    component.confirmId.set('ama-patient');

    component.complete(row);
    httpMock.expectOne((req: HttpRequest<unknown>) => req.url.endsWith('/complete')).flush(null, { status: 500, statusText: 'Error' });

    expect(component.actionError()).toBe('deletionRequests.error.complete');
    expect(component.busy()).toBe(false);
  });

  it('will not refuse a request without a reason', () => {
    answer([request()]);
    const row = component.rows()[0];
    component.startAction(row);

    component.rejectReason.set('   ');
    component.reject(row);

    httpMock.expectNone((req: HttpRequest<unknown>) => req.url.includes('/reject'));
  });

  it('sends a trimmed reason when refusing', () => {
    answer([request()]);
    const row = component.rows()[0];
    component.startAction(row);
    component.rejectReason.set('  legal hold until March  ');

    component.reject(row);

    const posted = httpMock.expectOne((req: HttpRequest<unknown>) => req.url.endsWith('/req-1/reject'));
    expect(posted.request.body).toEqual({ decisionReason: 'legal hold until March' });
    posted.flush(request({ status: 'REJECTED' }));
    answer([]);
  });

  it('counts what is past the promised date', () => {
    answer([
      request({ id: 'a', dueAt: new Date(Date.now() - 3 * DAY).toISOString() }),
      request({ id: 'b', dueAt: new Date(Date.now() + 1 * DAY).toISOString() }),
      request({ id: 'c', dueAt: new Date(Date.now() + 10 * DAY).toISOString() }),
    ]);

    // Fourteen days is a published promise. A promise nobody counts down is one that gets kept late.
    expect(component.overdueCount()).toBe(1);
    expect(component.isOverdue(component.rows()[0])).toBe(true);
    expect(component.isDueSoon(component.rows()[1])).toBe(true);
    expect(component.isDueSoon(component.rows()[2])).toBe(false);
  });

  it('never calls a closed request overdue', () => {
    answer([request({ status: 'COMPLETED', dueAt: new Date(Date.now() - 30 * DAY).toISOString() })]);

    expect(component.overdueCount()).toBe(0);
  });

  it('says the route may be missing rather than blaming the patient service', () => {
    // A 404 from our own gateway is indistinguishable at the browser from the patient service being
    // down, and the missing route is the cause in almost every case.
    httpMock
      .match((req: HttpRequest<unknown>) => req.url.includes('deletion-requests'))
      .forEach(req => req.flush(null, { status: 404, statusText: 'Not Found' }));

    expect(component.loadFailed()).toBe(true);
    expect(component.rows()).toEqual([]);
  });

  it('summarises what an erasure removed, dropping the empty collections', () => {
    answer([request({ status: 'COMPLETED', erasedCounts: { profile: 1, allergy: 3, report: 0, medication: 2 } })]);

    expect(component.erasedSummary(component.rows()[0])).toBe('profile 1 · allergy 3 · medication 2');
  });
});
