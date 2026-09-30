import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { GoogleService } from './google.service';
import { environment } from '../../environments/environment';
import { BYPASS_AUTH_INTERCEPTOR } from '../interceptors/bypass-auth-interceptor-context';

describe('GoogleService', () => {
  let service: GoogleService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [GoogleService, provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(GoogleService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads only the public Google client ID used for sign-in', async () => {
    const result = service.config();
    const request = http.expectOne(`${environment.apiUrl}/auth/google/config`);
    expect(request.request.context.get(BYPASS_AUTH_INTERCEPTOR)).toBe(true);
    request.flush({ clientId: 'client-id.apps.googleusercontent.com' });
    await expect(result).resolves.toEqual({ clientId: 'client-id.apps.googleusercontent.com' });
  });
});
