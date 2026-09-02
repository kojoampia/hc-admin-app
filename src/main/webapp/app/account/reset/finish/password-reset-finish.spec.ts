import { readFileSync } from 'node:fs';
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

    it('names the sign-in link from its own catalogue, not the stock one', () => {
      // The success panel's link read `global.messages.info.authenticated.link` — one word borrowed
      // out of a stock JHipster block whose siblings offer `admin`/`admin` as the default accounts.
      // This screen was that block's last reader; on the day it is cleaned out, as `home.json` was,
      // a borrowed key would leave the only way off this screen rendering as an empty anchor, and
      // nothing would fail. One more key is the cheaper side of that trade.
      withKey();

      comp.resetForm.patchValue({ newPassword: 'Admin@01234', confirmPassword: 'Admin@01234' });
      comp.finishReset();
      fixture.detectChanges();

      expect(html()).toContain('reset.finish.messages.signIn');
      expect(html()).not.toContain('global.messages.info');
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

    it('refuses a password longer than the gateway will accept', () => {
      withKey();

      // The mirror of the case above, and the half that was missing: `maxLength(100)` was pinned by
      // nothing, so widening it — or deleting it — kept every spec green while putting the exact
      // misreport the component's comment exists to prevent back on the screen. 101 characters is
      // one past `ManagedUserVM.PASSWORD_MAX_LENGTH`, and `AccountResource.finishPasswordReset`
      // checks the length before it looks the key up, so a password that reached the wire would come
      // back as the same bodyless 400 an expired key does and be reported as "your link has expired".
      //
      // Not a hypothetical length: a password manager's generated secret runs well past 100, and the
      // person pasting one has no reason to suspect the field of a limit it does not announce.
      const tooLong = 'A'.repeat(101);
      comp.resetForm.patchValue({ newPassword: tooLong, confirmPassword: tooLong });
      comp.finishReset();

      expect(comp.resetForm.controls.newPassword.errors?.maxlength).toBeTruthy();
      expect(comp.resetForm.invalid).toBe(true);
      expect(service.finish).not.toHaveBeenCalled();
    });

    it('reports the maximum the gateway really enforces, not a different number', () => {
      withKey();

      // The bound and the copy that reports it live in different files, and drifted: the validator
      // said 100 while `global.messages.validate.newpassword.maxlength` said 50. Nothing failed —
      // an 80-character password was accepted in silence and a 120-character one was refused with a
      // figure wrong in the other direction. Reading the catalogue here is what ties them together;
      // asserting only that *a* maxlength message renders would have passed throughout.
      const en = JSON.parse(readFileSync('src/main/webapp/i18n/en/global.json', 'utf8')) as {
        global: { messages: { validate: { newpassword: { maxlength: string }; confirmpassword: { maxlength: string } } } };
      };
      const validate = en.global.messages.validate;

      expect(validate.newpassword.maxlength).toContain('100');
      expect(validate.confirmpassword.maxlength).toContain('100');

      const tooLong = 'A'.repeat(101);
      comp.resetForm.patchValue({ newPassword: tooLong, confirmPassword: tooLong });
      comp.resetForm.controls.newPassword.markAsTouched();
      fixture.detectChanges();

      // And the message the catalogue's number belongs to is the one this screen actually renders.
      expect(html()).toContain('global.messages.validate.newpassword.maxlength');
    });
  });
});
