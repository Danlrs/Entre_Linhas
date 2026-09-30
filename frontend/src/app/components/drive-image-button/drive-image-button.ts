import { Component, EventEmitter, Input, OnInit, OnDestroy, Output, signal } from '@angular/core';
import { GoogleConfig, GoogleService } from '../../services/google.service';

@Component({
  selector: 'app-drive-image-button',
  standalone: true,
  template: `
    @if (config()) {
      <button type="button" [disabled]="busy() || disabled" (click)="select()"
        class="my-2 px-4 py-2 border border-[#EDE8E0] rounded-lg text-sm bg-white disabled:opacity-50">
        {{ busy() ? 'Importando do Drive...' : 'Selecionar do Google Drive' }}
      </button>
    }
    @if (error()) { <p class="text-sm text-red-600" role="alert">{{ error() }}</p> }
  `,
})
export class DriveImageButton implements OnInit, OnDestroy {
  @Input() multiple = false;
  @Input() disabled = false;
  @Output() selected = new EventEmitter<File[]>();
  config = signal<GoogleConfig | null>(null);
  busy = signal(false);
  error = signal('');
  private destroyed = false;
  constructor(private googleService: GoogleService) {}

  async ngOnInit(): Promise<void> {
    try {
      const config = await this.googleService.preparePicker();
      if (!this.destroyed && config.clientId && config.pickerApiKey && config.projectNumber) this.config.set(config);
    } catch { this.error.set('Google Drive indisponível. Recarregue a página ou envie uma foto do dispositivo.'); }
  }

  async select(): Promise<void> {
    const config = this.config();
    if (!config || this.busy() || this.disabled) return;
    this.busy.set(true); this.error.set('');
    try {
      const files = await this.googleService.selectImages(config, this.multiple);
      if (!this.destroyed && files.length) this.selected.emit(files);
    } catch (error) { this.error.set(error instanceof Error ? error.message : 'Erro ao importar imagens.'); }
    finally { this.busy.set(false); }
  }

  ngOnDestroy(): void { this.destroyed = true; }
}
