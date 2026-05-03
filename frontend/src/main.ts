import { bootstrapApplication } from '@angular/platform-browser';
import { environment } from './environments/environment';
import * as Sentry from '@sentry/angular';
import { appConfig } from './app/app.config';
import { App } from './app/app';

if (environment.sentryDsn) {
  Sentry.init({
    dsn: environment.sentryDsn,
    environment: environment.production ? 'production' : 'development',
    tracesSampleRate: environment.production ? 0.15 : 1.0,
  });
}

bootstrapApplication(App, appConfig).catch((err) => console.error(err));
