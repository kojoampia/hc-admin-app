import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, LOCALE_ID, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import {
  NavigationError,
  Router,
  RouterFeatures,
  TitleStrategy,
  provideRouter,
  withComponentInputBinding,
  withDebugTracing,
  withInMemoryScrolling,
  withNavigationErrorHandler,
} from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';

import { NgbDateAdapter } from '@ng-bootstrap/ng-bootstrap/datepicker';
import { environment } from 'environments/environment';

import { authExpiredInterceptor } from 'app/core/interceptor/auth-expired.interceptor';
import { authInterceptor } from 'app/core/interceptor/auth.interceptor';
import { errorHandlerInterceptor } from 'app/core/interceptor/error-handler.interceptor';
import { notificationInterceptor } from 'app/core/interceptor/notification.interceptor';

import './config/dayjs';
import { provideTranslation } from 'app/shared/language/translation.provider';

import { AppPageTitleStrategy } from './app-page-title-strategy';
import routes from './app.routes';
import { NgbDateDayjsAdapter } from './config/datepicker-adapter';

const routerFeatures: RouterFeatures[] = [
  withComponentInputBinding(),
  // Angular defaults to leaving the scroll position where it was, so
  // arriving at a screen part-way down is the default rather than the
  // exception. Restore on back/forward, top on a fresh navigation.
  withInMemoryScrolling({ scrollPositionRestoration: 'enabled', anchorScrolling: 'enabled' }),
  withNavigationErrorHandler((e: NavigationError) => {
    const router = inject(Router);
    if (e.error.status === 403) {
      router.navigate(['/accessdenied']);
    } else if (e.error.status === 404) {
      router.navigate(['/404']);
    } else if (e.error.status === 401) {
      router.navigate(['/login']);
    } else {
      router.navigate(['/error']);
    }
  }),
];
if (environment.DEBUG_INFO_ENABLED) {
  routerFeatures.push(withDebugTracing());
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideTranslation(),
    provideRouter(routes, ...routerFeatures),
    // Set this to true to enable service worker (PWA)
    provideServiceWorker('ngsw-worker.js', { enabled: false }),
    // Order matters: authInterceptor attaches the bearer token, then the expired/error/notification
    // handlers see the real response. There was a fifth entry here, mockApiInterceptor, which
    // answered every /api/** and /management/** request inside the browser before it reached the
    // network. It is gone — hc-admin-service seeds the console's dataset under
    // `spring.profiles.active=test`, so there is a real backend to talk to.
    provideHttpClient(withInterceptors([authInterceptor, authExpiredInterceptor, errorHandlerInterceptor, notificationInterceptor])),
    Title,
    { provide: LOCALE_ID, useValue: 'en' },
    { provide: NgbDateAdapter, useClass: NgbDateDayjsAdapter },
    { provide: TitleStrategy, useClass: AppPageTitleStrategy },
  ],
};
