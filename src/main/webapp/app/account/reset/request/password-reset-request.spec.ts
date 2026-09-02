import { beforeEach, describe, expect, it, vitest } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { provideTranslateService } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';

import { PasswordResetService } from 'app/account/reset/password-reset.service';

import PasswordResetRequest from './password-reset-request';

describe('PasswordResetRequest', () => {
  let comp: PasswordResetRequest;
  let fixture: ComponentFixture<PasswordResetRequest>;
  let service: PasswordResetService;

  const html = (): string => (fixture.nativeElement as HTMLElement).innerHTML;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideTranslateService(),
        { provide: PasswordResetService, useValue: { init: vitest.fn(() => of({})) } },
      ],
    });

    fixture = TestBed.createComponent(PasswordResetRequest);
    comp = fixture.componentInstance;
    service = TestBed.inject(PasswordResetService);
    fixture.detectChanges();
  });

  it('sends the address and reports that a mail is on its way', () => {
    comp.requestForm.patchValue({ email: 'efua.mensah@abofonsa.care' });
    comp.requestReset();
    fixture.detectChanges();

    expect(service.init).toHaveBeenCalledWith('efua.mensah@abofonsa.care');
    expect(comp.success()).toBe(true);
    expect(html()).toContain('reset.request.messages.success');
    // The form goes; a second submit of the same address does nothing useful and reads as a failure.
    expect(html()).not.toContain('data-cy="emailResetPassword"');
  });

  it('says nothing about whether the address is registered', () => {
    // The gateway answers 200 either way, on purpose, so that this form cannot be used to find out
    // which addresses hold accounts. The screen must not undo that by wording success more
    // precisely than the server does — `reset.request.messages.success` is the only key it renders
    // on the success path, and it says "check your email", not "we found you".
    comp.requestForm.patchValue({ email: 'nobody@example.com' });
    comp.requestReset();
    fixture.detectChanges();

    expect(comp.success()).toBe(true);
    expect(html()).not.toContain('reset.request.messages.error');
  });

  it('refuses an address that is not one, without calling the gateway', () => {
    comp.requestForm.patchValue({ email: 'not-an-address' });
    comp.requestReset();

    expect(comp.requestForm.invalid).toBe(true);
    expect(service.init).not.toHaveBeenCalled();
    expect(comp.success()).toBe(false);
  });

  it('reports a transport failure rather than claiming a mail was sent', () => {
    // The one case where "check your email" would be a lie, and the reason this screen has an error
    // branch at all: signed out there is no shell, so `abf-alert-error` is not on the page and the
    // errorHandlerInterceptor's broadcast reaches nothing that renders.
    service.init = vitest.fn(() => throwError(() => new Error('down')));

    comp.requestForm.patchValue({ email: 'efua.mensah@abofonsa.care' });
    comp.requestReset();
    fixture.detectChanges();

    expect(comp.success()).toBe(false);
    expect(comp.failed()).toBe(true);
    expect(html()).toContain('reset.request.messages.error');
  });

  it('offers a way back to the sign-in page', () => {
    expect(html()).toContain('data-cy="backToLogin"');
  });
});
