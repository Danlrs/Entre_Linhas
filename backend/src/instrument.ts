import * as Sentry from '@sentry/nestjs';

/** Carrega antes dos demais módulos (@sentry/nestjs). Env completo é validado em `main.ts`. */
const dsn = process.env.SENTRY_DSN?.trim();
const nodeEnv = process.env.NODE_ENV ?? 'development';
if (dsn && /^https:\/\/.+/.test(dsn)) {
  Sentry.init({
    dsn,
    environment: nodeEnv,
    tracesSampleRate: nodeEnv === 'production' ? 0.2 : 1.0,
  });
}
