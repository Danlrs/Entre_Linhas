import { Component, OnDestroy, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient, HttpContext, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { BYPASS_AUTH_INTERCEPTOR } from '../../interceptors/bypass-auth-interceptor-context';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-password-recovery',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './password-recovery.html',
  styles: [`
    :host { display:block; }
    label { display:block; font-size:.85rem; font-weight:600; margin-bottom:.4rem; }
    input { width:100%; border:1px solid #ded7cd; border-radius:.65rem; padding:.85rem; margin-bottom:1rem; }
    input:focus { outline:2px solid #cf4e4e; outline-offset:1px; }
    button.primary { width:100%; background:#cf4e4e; color:white; padding:.85rem; border-radius:.65rem; font-weight:600; }
    button:disabled { opacity:.5; cursor:not-allowed; }
  `],
})
export class PasswordRecovery implements OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  readonly step = signal<'email' | 'code' | 'password' | 'done'>('email');
  readonly busy = signal(false);
  readonly error = signal('');
  readonly notice = signal('');
  readonly resendSeconds = signal(0);
  private timer?: ReturnType<typeof setInterval>;
  private token = '';
  private email = '';
  private destroyed = false;

  readonly emailForm = this.fb.nonNullable.group({ email: ['', [Validators.required, Validators.email]] });
  readonly codeForm = this.fb.nonNullable.group({ code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]] });
  readonly passwordForm = this.fb.nonNullable.group({
    password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(72)]],
    confirmation: ['', Validators.required],
  });

  get destination(): string { return this.email; }

  async requestCode(resend = false): Promise<void> {
    if (this.busy() || (resend && this.resendSeconds() > 0) || (!resend && this.emailForm.invalid)) return;
    this.busy.set(true); this.error.set('');
    if (!resend) this.email = this.emailForm.getRawValue().email.trim().toLowerCase();
    try {
      const result = await this.post<{ message: string }>('request', { email: this.email });
      if (this.destroyed) return;
      this.token = ''; this.codeForm.reset();
      this.notice.set(result.message); this.step.set('code');
      this.resendSeconds.set(60);
      clearInterval(this.timer);
      this.timer = setInterval(() => {
        this.resendSeconds.update((value) => Math.max(0, value - 1));
        if (!this.resendSeconds()) clearInterval(this.timer);
      }, 1000);
    } catch (error) { this.showError(error); }
    finally { this.busy.set(false); }
  }

  async verifyCode(): Promise<void> {
    if (this.busy() || this.codeForm.invalid) return;
    this.busy.set(true); this.error.set('');
    try {
      const result = await this.post<{ token: string }>('verify', { email: this.email, code: this.codeForm.getRawValue().code });
      if (this.destroyed) return;
      this.token = result.token; this.codeForm.reset(); this.notice.set(''); this.step.set('password');
    } catch (error) { this.showError(error); }
    finally { this.busy.set(false); }
  }

  async resetPassword(): Promise<void> {
    if (this.busy() || this.passwordForm.invalid) return;
    const { password, confirmation } = this.passwordForm.getRawValue();
    if (password !== confirmation) { this.error.set('As senhas não coincidem.'); return; }
    this.busy.set(true); this.error.set('');
    try {
      await this.post('reset', { token: this.token, password });
      if (this.destroyed) return;
      this.token = ''; this.passwordForm.reset(); this.auth.clearSession(); this.step.set('done');
    } catch (error) { this.showError(error); }
    finally { this.busy.set(false); }
  }

  restart(): void {
    if (this.busy()) return;
    this.token = ''; this.error.set(''); this.notice.set(''); this.passwordForm.reset(); this.codeForm.reset();
    this.step.set('email');
  }

  private post<T>(action: string, body: object): Promise<T> {
    return firstValueFrom(this.http.post<T>(`${environment.apiUrl}/auth/password/${action}`, body, {
      context: new HttpContext().set(BYPASS_AUTH_INTERCEPTOR, true),
    }));
  }

  private showError(error: unknown): void {
    if (error instanceof HttpErrorResponse && error.status === 429) {
      this.error.set('Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.'); return;
    }
    const message = (error as { error?: { message?: string | string[] } }).error?.message;
    this.error.set(Array.isArray(message) ? message.join(' ') : message || 'Não foi possível conectar. Tente novamente.');
  }

  ngOnDestroy(): void { this.destroyed = true; this.token = ''; clearInterval(this.timer); }
}
