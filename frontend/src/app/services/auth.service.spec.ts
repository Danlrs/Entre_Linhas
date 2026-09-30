import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';

import { AuthService } from './auth.service';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../environments/environment';
import { BYPASS_AUTH_INTERCEPTOR } from '../interceptors/bypass-auth-interceptor-context';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AuthService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuthService);
    localStorage.clear();
  });

  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('stores the existing session format after Google login', () => {
    service.loginGoogle('google-token').subscribe();
    const req = TestBed.inject(HttpTestingController).expectOne(`${environment.apiUrl}/auth/google`);
    expect(req.request.body).toEqual({ credential: 'google-token' });
    expect(req.request.context.get(BYPASS_AUTH_INTERCEPTOR)).toBe(true);
    req.flush({ access_token: 'access', refresh_token: 'refresh', user: { id: 1, login: 'admin', email: 'a@example.com' } });
    expect(service.getToken()).toBe('access');
    expect(localStorage.getItem('refresh_token')).toBe('refresh');
    expect(service.getCurrentUser()?.id).toBe(1);
  });

  it('keeps the current session when linking Google', () => {
    localStorage.setItem('access_token', 'existing');
    service.linkGoogle('google-token').subscribe();
    const req = TestBed.inject(HttpTestingController).expectOne(`${environment.apiUrl}/auth/google/link`);
    expect(req.request.context.get(BYPASS_AUTH_INTERCEPTOR)).toBe(false);
    req.flush({ ok: true });
    expect(service.getToken()).toBe('existing');
  });
});
