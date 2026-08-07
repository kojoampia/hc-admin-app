import { Provider } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { provideTranslateService } from '@ngx-translate/core';

import { Account } from 'app/core/auth/account.model';
import { AccountService } from 'app/core/auth/account.service';
import { fontAwesomeIcons } from 'app/config/font-awesome-icons';
import { MOCK_LATENCY, mockApiInterceptor } from 'app/core/mock/mock-api.interceptor';
import { resetDatabase } from 'app/core/mock/mock-db';

/**
 * The setup every console screen spec needs.
 *
 * Console specs drive the real components against the real mock API rather
 * than a stubbed service, because the thing worth testing is that the screen
 * and the HTTP contract agree. That means three things have to be arranged:
 * a clean database per test, zero latency so assertions are not racing a
 * timeout, and a populated icon library so `fa-icon` does not log an error
 * for every glyph in the template.
 */
export const provideConsoleTesting = (extra: Provider[] = []): void => {
  // Reset first: some suites configure a module more than once in a test —
  // "as the administrator, then as the supervisor" — and reconfiguring an
  // already-instantiated TestBed leaves the injector and the zone in a state
  // that strands pending requests, including in unrelated spec files.
  TestBed.resetTestingModule();
  resetDatabase();

  TestBed.configureTestingModule({
    providers: [
      provideTranslateService(),
      provideRouter([]),
      provideHttpClient(withInterceptors([mockApiInterceptor])),
      // Without this every request waits 120ms and the suite becomes a race.
      { provide: MOCK_LATENCY, useValue: 0 },
      ...extra,
    ],
  });

  // fa-icon resolves against the library, not the import; an unregistered
  // icon logs an ERROR per render and drowns the real output.
  TestBed.inject(FaIconLibrary).addIcons(...fontAwesomeIcons);
};

export const accountWith = (authorities: string[]): Account => ({
  activated: true,
  authorities,
  email: 'efua.mensah@abofonsa.care',
  firstName: 'Efua',
  langKey: 'en',
  lastName: 'Mensah',
  login: 'efua.mensah@abofonsa.care',
  imageUrl: null,
});

export const signInAs = (authorities: string[]): void => {
  TestBed.inject(AccountService).authenticate(accountWith(authorities));
};

/**
 * Let the pending HTTP round trips resolve.
 *
 * With MOCK_LATENCY at 0 the interceptor still goes through rxjs `delay(0)`,
 * so a macrotask tick is required; screens that chain two requests need two.
 */
export const settle = async (ticks = 4): Promise<void> => {
  for (let tick = 0; tick < ticks; tick++) {
    await new Promise(resolve => setTimeout(resolve, 0));
  }
};
