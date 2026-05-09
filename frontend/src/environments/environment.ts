export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api',
  /** HTTPS DSN from Sentry; vazio desliga o relatório automático no browser. */
  sentryDsn: '',
  /** WhatsApp só dígitos (país + DDD + número), sem + ou espaços. */
  whatsappPhoneE164: '5575991270779',
  /** Texto pré-preenchido ao abrir o chat pelo botão flutuante. */
  whatsappDefaultMessage: 'Olá! Vim pelo site Entre Linhas e gostaria de conversar.',
};
