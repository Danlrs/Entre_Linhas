import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { PasswordRecovery } from './password-recovery';
import { environment } from '../../../environments/environment';
import { BYPASS_AUTH_INTERCEPTOR } from '../../interceptors/bypass-auth-interceptor-context';

describe('Password recovery screens', () => {
  let fixture: ComponentFixture<PasswordRecovery>;
  let component: PasswordRecovery;
  let http: HttpTestingController;
  const url = `${environment.apiUrl}/auth/password`;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [PasswordRecovery],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])] });
    fixture = TestBed.createComponent(PasswordRecovery);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });
  afterEach(() => { fixture.destroy(); http.verify(); localStorage.clear(); });

  async function request() {
    component.emailForm.setValue({ email: 'User@Example.com' });
    const pending = component.requestCode();
    const req = http.expectOne(`${url}/request`);
    expect(req.request.body.email).toBe('user@example.com');
    expect(req.request.context.get(BYPASS_AUTH_INTERCEPTOR)).toBe(true);
    req.flush({ message: 'Se cadastrado, enviaremos o código.' });
    await pending;
  }

  it('moves from email to code, with a cooldown for resend', async () => {
    await request();
    expect(component.step()).toBe('code');
    expect(component.resendSeconds()).toBe(60);
    await component.requestCode(true);
    http.expectNone(`${url}/request`);
  });

  it('requires a valid code before showing password reset and clears the session on success', async () => {
    await request();
    component.codeForm.setValue({ code: '123456' });
    const verifying = component.verifyCode();
    http.expectOne(`${url}/verify`).flush({ token: 'a'.repeat(64) });
    await verifying;
    expect(component.step()).toBe('password');
    localStorage.setItem('access_token', 'old-session');
    component.passwordForm.setValue({ password: 'new-password', confirmation: 'new-password' });
    const saving = component.resetPassword();
    const req = http.expectOne(`${url}/reset`);
    expect(req.request.body).toEqual({ token: 'a'.repeat(64), password: 'new-password' });
    req.flush({ message: 'Senha redefinida.' });
    await saving;
    expect(component.step()).toBe('done');
    expect(localStorage.getItem('access_token')).toBeNull();
    expect(component.passwordForm.getRawValue().password).toBe('');
  });

  it('keeps the code screen and shows the server error for a wrong code', async () => {
    await request();
    component.codeForm.setValue({ code: '000000' });
    const pending = component.verifyCode();
    http.expectOne(`${url}/verify`).flush({ message: 'Código inválido ou expirado.' }, { status: 400, statusText: 'Bad Request' });
    await pending;
    expect(component.step()).toBe('code');
    expect(component.error()).toContain('Código inválido');
    expect(component.busy()).toBe(false);
  });

  it('does not submit mismatched passwords', async () => {
    component.passwordForm.setValue({ password: 'password-one', confirmation: 'password-two' });
    await component.resetPassword();
    http.expectNone(`${url}/reset`);
    expect(component.error()).toContain('não coincidem');
  });

  it('starts a fresh recovery after page reload instead of persisting the reset token', () => {
    expect(component.step()).toBe('email');
    expect(component.emailForm.getRawValue().email).toBe('');
  });
});
