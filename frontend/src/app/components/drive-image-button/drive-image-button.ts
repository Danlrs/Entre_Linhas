import { Component, EventEmitter, Input, OnInit, OnDestroy, Output, signal } from '@angular/core';
import { GoogleConfig, GoogleService } from '../../services/google.service';

@Component({
  selector: 'app-drive-image-button',
  standalone: true,
  template: `
    @if (config()) {
      <div class="my-3 rounded-xl border border-[#EDE8E0] bg-white p-3 flex items-center gap-3">
        <span class="w-9 h-9 shrink-0 rounded-lg bg-[#F5F1EB] text-[#CF4E4E] flex items-center justify-center" aria-hidden="true">
          <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
            <path stroke-linecap="round" stroke-linejoin="round" d="m8 3-5 9 5 9h8l5-9-5-9H8Zm0 0 5 9m3 9-3-9m5-9-5 9M3 12h10" />
          </svg>
        </span>
        <div class="min-w-0 flex-1">
          <p class="text-sm font-semibold text-[#2C2C2C]">Foto do Google Drive</p>
          <p class="text-xs text-[#626262] mt-0.5">Busca somente imagens, sem pastas nem documentos.</p>
        </div>
        <button type="button" [disabled]="busy() || disabled" (click)="select()"
          class="shrink-0 px-3 py-2 border border-[#EDE8E0] rounded-lg text-xs sm:text-sm font-semibold text-[#CF4E4E] hover:border-[#CF4E4E] hover:bg-[#FAF7F2] disabled:opacity-50">
          {{ busy() ? 'Abrindo...' : 'Escolher' }}
        </button>
      </div>
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
