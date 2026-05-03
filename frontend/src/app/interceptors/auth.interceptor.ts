import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';

import { AuthService } from '../services/auth.service';
import { BYPASS_AUTH_INTERCEPTOR } from './bypass-auth-interceptor-context';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (req.context.get(BYPASS_AUTH_INTERCEPTOR)) {
    return next(req);
  }

  const token = localStorage.getItem('access_token');
  const handled = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(handled).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status !== 401) {
        return throwError(() => err);
      }

      if (req.url.includes('/auth/login')) {
        return throwError(() => err);
      }

      const refresh = localStorage.getItem('refresh_token');
      if (!refresh) {
        auth.clearSession();
        router.navigate(['/admin'], { queryParams: { sessionExpired: '1' } });
        return throwError(() => err);
      }

      return auth.refreshAccessToken().pipe(
        switchMap(() => {
          const newToken = localStorage.getItem('access_token');
          if (!newToken) {
            auth.clearSession();
            router.navigate(['/admin'], { queryParams: { sessionExpired: '1' } });
            return throwError(() => err);
          }
          return next(req.clone({ setHeaders: { Authorization: `Bearer ${newToken}` } }));
        }),
        catchError((e: HttpErrorResponse) => {
          auth.clearSession();
          router.navigate(['/admin'], { queryParams: { sessionExpired: '1' } });
          return throwError(() => e);
        }),
      );
    }),
  );
};
