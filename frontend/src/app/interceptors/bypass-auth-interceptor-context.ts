import { HttpContextToken } from '@angular/common/http';

/** Evita loops no interceptor ao chamar `/auth/refresh` ou `/auth/logout`. */
export const BYPASS_AUTH_INTERCEPTOR = new HttpContextToken<boolean>(() => false);
