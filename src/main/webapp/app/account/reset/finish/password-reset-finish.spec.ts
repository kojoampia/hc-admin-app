import { beforeEach, describe, expect, it, vitest } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { provideTranslateService } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';

import { PasswordResetService } from 'app/account/reset/password-reset.service';

import PasswordResetFinish from './password-reset-finish';

/**
 * The four states a real emailed link can arrive in, and the one thing this screen must never do:
 * report a broken link as a bad password.
 */
describe('PasswordResetFinish', () => {
  let comp: PasswordResetFinish;
  let fixture: ComponentFixture<PasswordResetFinish>;
  let service: PasswordResetService;

  const html = (): string => (fixture.nativeElement as HTMLElement).innerHTML;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideTranslateService(),
        { provide: PasswordResetService, useValue: { finish: vitest.fn(() => of({})) } },
      ],
    });

    fixture = TestBed.createComponent(PasswordResetFinish);
    comp = fixture.componentInstance;
    service = TestBed.inject(PasswordResetService);
  });

  /** The state the emails produce. */
  const withKey = (key = 'cy1yCud5CkXb4PHsv78G'): void => {
    fixture.componentRef.setInput('key', key);
    fixture.detectChanges();
  };

  describe('with no key in the query string', () => {
    /**
     * The state the router actually produces, and it is not the declared default.
     *
     * <p>`withComponentInputBinding()` writes to every declared input on each navigation and writes
     * `undefined` for one the route carries no value for, so a signal input's default is overwritten
     * rather than kept. `key` was `input('')` first and this screen threw
     * `Cannot read properties of undefined (reading 'length')` on a visit to
     * `/account/reset/finish` with no query string — rendering an empty card with neither the form
     * nor the missing-key message, and reporting the failure only to the browser console.
     *
     * <p>Leaving the input alone, which is what this block did first, exercises the default and not
     * the router. Set it, or this case cannot fail the way the screen did.
     */
    beforeEach(() => {
      fixture.componentRef.setInput('key', undefined);
    });

    it('says the key is missing and offers no form', () => {
      fixture.detectChanges();

      expect(comp.keyMissing()).toBe(true);
      expect(html()).toContain('reset.finish.messages.keymissing');
      // The form is withheld rather than shown-and-rejected. A submit with an empty key comes back
      // as the same 400 an expired key does, so offering it here would tell somebody with a mangled
      // link that their password was wrong.
      expect(html()).not.toContain('data-cy="resetPassword"');
    });

    it('does not call the gateway even if a submit is forced', () => {
      fixture.detectChanges();

      comp.resetForm.patchValue({ newPassword: 'Admin@01234', confirmPassword: 'Admin@01234' });
      comp.finishReset();

      expect(service.finish).not.toHaveBeenCalled();
    });
  });

  describe('with a key', () => {
    it('offers the form', () => {
      withKey();

      expect(comp.keyMissing()).toBe(false);
      expect(html()).toContain('data-cy="resetPassword"');
      expect(html()).not.toContain('reset.finish.messages.keymissing');
    });

    it('refuses to submit when the confirmation does not match, and says so', () => {
      withKey();

      comp.resetForm.patchValue({ newPassword: 'Admin@01234', confirmPassword: 'Admin@0123' });
      fixture.detectChanges();

      expect(comp.doesNotMatch()).toBe(true);
      expect(html()).toContain('global.messages.error.dontmatch');

      comp.finishReset();
      expect(service.finish).not.toHaveBeenCalled();
    });

    it('does not call a half-typed confirmation a mismatch', () => {
      withKey();

      // An empty second box is "not filled in yet", which the required validator already reports.
      // Calling it a mismatch would put a red line under a field nobody had touched.
      comp.resetForm.patchValue({ newPassword: 'Admin@01234', confirmPassword: '' });

      expect(comp.doesNotMatch()).toBe(false);
    });

    it('sends the key from the query string and the new password, and reports success', () => {
      withKey('a-key-from-an-email');

      comp.resetForm.patchValue({ newPassword: 'Admin@01234', confirmPassword: 'Admin@01234' });
      comp.finishReset();
      fixture.detectChanges();

      expect(service.finish).toHaveBeenCalledWith('a-key-from-an-email', 'Admin@01234');
      expect(comp.success()).toBe(true);
      expect(comp.failed()).toBe(false);
      expect(html()).toContain('reset.finish.messages.success');
      // Success replaces the form; there is nothing left to submit.
      expect(html()).not.toContain('data-cy="resetPassword"');
    });

    it('reports the gateway rejecting a spent or expired key', () => {
      // The 24-hour case, and the single-use case, and a key from a different environment: the
      // gateway reports all three the same way with no body, so the screen can only offer the one
      // message — which is why `reset.finish.messages.error` names the 24 hours itself.
      service.finish = vitest.fn(() => throwError(() => new Error('rejected')));
      withKey();

      comp.resetForm.patchValue({ newPassword: 'Admin@01234', confirmPassword: 'Admin@01234' });
      comp.finishReset();
      fixture.detectChanges();

      expect(comp.success()).toBe(false);
      expect(comp.failed()).toBe(true);
      expect(html()).toContain('reset.finish.messages.error');
      // And a way onwards, rather than a dead end: the form stays, and the panel offers a fresh key.
      expect(html()).toContain('data-cy="requestNewKey"');
    });

    it('refuses a password shorter than the gateway will accept', () => {
      withKey();

      // Four characters is `ManagedUserVM.PASSWORD_MIN_LENGTH`. Below it the gateway answers 400
      // before it looks the key up at all, indistinguishable from an expired key — so a short
      // password that reached the wire would be reported as a broken link.
      comp.resetForm.patchValue({ newPassword: 'abc', confirmPassword: 'abc' });
      comp.finishReset();

      expect(comp.resetForm.invalid).toBe(true);
      expect(service.finish).not.toHaveBeenCalled();
    });
  });
});
