/**
 * Substitua `apiUrl` pela URL pública do backend em produção (Render),
 * mantendo o sufixo `/api`. Exemplo:
 *   apiUrl: 'https://entre-linhas-backend.onrender.com/api'
 *
 * `sentryDsn` é opcional; deixe vazio se ainda não criou o projeto Sentry.
 */
export const environment = {
  production: true,
  apiUrl: 'https://CHANGE-ME.onrender.com/api',
  sentryDsn: '',
};
