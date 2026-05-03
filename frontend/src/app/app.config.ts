import { ApplicationConfig, ErrorHandler, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { createErrorHandler } from '@sentry/angular';

import { routes } from './app.routes';
import { authInterceptor } from './interceptors/auth.interceptor';
import { environment } from '../environments/environment';

const sentryProviders: ApplicationConfig['providers'] = environment.sentryDsn
  ? [{ provide: ErrorHandler, useValue: createErrorHandler({ showDialog: false }) }]
  : [];

export const appConfig: ApplicationConfig = {
  providers: [
    ...sentryProviders,
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
  ],
};
