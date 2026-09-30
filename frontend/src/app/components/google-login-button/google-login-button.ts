import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnDestroy, Output, ViewChild, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { GoogleService } from '../../services/google.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-google-login-button',
  standalone: true,
  template: `
    <div #button [style.pointer-events]="busy() ? 'none' : 'auto'" class="flex justify-center my-3"></div>
    @if (busy()) { <p class="text-sm text-center" role="status">Aguarde...</p> }
    @if (message()) { <p class="text-sm text-center my-2" role="status">{{ message() }}</p> }
  `,
})
export class GoogleLoginButton implements AfterViewInit, OnDestroy {
  @Input() link = false;
  @Output() completed = new EventEmitter<void>();
  @ViewChild('button', { static: true }) button!: ElementRef<HTMLElement>;
  busy = signal(false);
  message = signal('');
  private destroyed = false;
  constructor(private googleService: GoogleService, private auth: AuthService) {}

  async ngAfterViewInit(): Promise<void> {
    try {
      const config = await this.googleService.config();
      if (!config.clientId || this.destroyed) return;
      await this.googleService.loadIdentity();
      if (this.destroyed) return;
      google.accounts.id.initialize({
        client_id: config.clientId,
        auto_select: false,
        callback: (response) => { if (!this.destroyed) void this.submit(response.credential); },
      });
      google.accounts.id.renderButton(this.button.nativeElement, {
        type: 'standard', theme: 'outline', size: 'large', text: 'continue_with',
        shape: 'pill', logo_alignment: 'left', locale: 'pt-BR', width: 300,
      });
    } catch {
      if (!this.destroyed) this.message.set('Google indisponível no momento. Recarregue a página para tentar novamente.');
    }
  }

  private async submit(credential: string): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true); this.message.set('');
    try {
      if (this.link) await firstValueFrom(this.auth.linkGoogle(credential));
      else await firstValueFrom(this.auth.loginGoogle(credential));
      if (this.destroyed) return;
      if (this.link) this.message.set('Conta Google vinculada. Você já pode entrar com o Google.');
      this.completed.emit();
    } catch (error) {
      const message = (error as { error?: { message?: string } }).error?.message;
      this.message.set(message || 'Não foi possível entrar com o Google. Tente novamente.');
    } finally { this.busy.set(false); }
  }

  ngOnDestroy(): void { this.destroyed = true; }
}
