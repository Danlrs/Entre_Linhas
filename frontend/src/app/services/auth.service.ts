import { Injectable } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { Observable, finalize, shareReplay, take, tap, throwError } from 'rxjs';

import { environment } from '../../environments/environment';
import { BYPASS_AUTH_INTERCEPTOR } from '../interceptors/bypass-auth-interceptor-context';

export interface LoginRequest {
  login: string;
  password: string;
}

export interface AuthUser {
  id: number;
  login: string;
  email: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  user: AuthUser;
}

export interface RefreshResponse {
  access_token: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly authUrl = `${environment.apiUrl}/auth`;
  /** Requisição única de refresh em voo quando vários endpoints retornam 401 ao mesmo tempo. */
  private refreshShared$: Observable<RefreshResponse> | null = null;

  constructor(private http: HttpClient) {}

  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.authUrl}/login`, credentials).pipe(
      tap((response) => {
        if (response.access_token) {
          localStorage.setItem('access_token', response.access_token);
        }
        if (response.refresh_token) {
          localStorage.setItem('refresh_token', response.refresh_token);
        }
        localStorage.setItem('user', JSON.stringify(response.user));
      }),
    );
  }

  logout(): void {
    const rt = localStorage.getItem('refresh_token');
    if (rt) {
      this.http
        .post<{ ok: true }>(
          `${this.authUrl}/logout`,
          { refresh_token: rt },
          {
            context: new HttpContext().set(BYPASS_AUTH_INTERCEPTOR, true),
          },
        )
        .pipe(take(1))
        .subscribe({ error: () => undefined });
    }
    this.clearSession();
  }

  clearSession(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
  }

  refreshAccessToken(): Observable<RefreshResponse> {
    const rt = localStorage.getItem('refresh_token');
    if (!rt) {
      return throwError(() => new Error('no refresh token'));
    }
    if (!this.refreshShared$) {
      const ctx = new HttpContext().set(BYPASS_AUTH_INTERCEPTOR, true);
      this.refreshShared$ = this.http
        .post<RefreshResponse>(
          `${this.authUrl}/refresh`,
          { refresh_token: rt },
          { context: ctx },
        )
        .pipe(
          tap((r) => {
            localStorage.setItem('access_token', r.access_token);
          }),
          shareReplay({ bufferSize: 1, refCount: false }),
          finalize(() => {
            this.refreshShared$ = null;
          }),
        );
    }
    return this.refreshShared$;
  }

  isAuthenticated(): boolean {
    const refresh = localStorage.getItem('refresh_token');
    const access = localStorage.getItem('access_token');
    if ((!access || this.isTokenExpired(access)) && !refresh) {
      return false;
    }
    if (access && !this.isTokenExpired(access)) {
      return true;
    }
    return !!refresh;
  }

  getToken(): string | null {
    return localStorage.getItem('access_token');
  }

  getCurrentUser(): { id: number; login: string; email?: string } | null {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }

  private isTokenExpired(token: string): boolean {
    const payload = this.decodeToken(token);
    if (!payload || typeof payload.exp !== 'number') return false;
    const nowSeconds = Math.floor(Date.now() / 1000);
    return payload.exp <= nowSeconds;
  }

  private decodeToken(token: string): { exp?: number; [k: string]: unknown } | null {
    try {
      const [, payload] = token.split('.');
      if (!payload) return null;
      const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
      const padded = normalized + '==='.slice((normalized.length + 3) % 4);
      const json = atob(padded);
      return JSON.parse(json);
    } catch {
      return null;
    }
  }
}
