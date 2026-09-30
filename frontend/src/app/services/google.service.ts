/// <reference types="google.accounts" />
/// <reference types="google.picker" />
import { Injectable } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { BYPASS_AUTH_INTERCEPTOR } from '../interceptors/bypass-auth-interceptor-context';

export interface GoogleConfig {
  clientId: string;
  pickerApiKey: string;
  projectNumber: string;
  maxFileBytes: number;
}

@Injectable({ providedIn: 'root' })
export class GoogleService {
  private configPromise?: Promise<GoogleConfig>;
  private scripts = new Map<string, Promise<void>>();
  private pickerReady?: Promise<void>;

  constructor(private http: HttpClient) {}

  config(): Promise<GoogleConfig> {
    return this.configPromise ??= firstValueFrom(this.http.get<GoogleConfig>(
      `${environment.apiUrl}/auth/google/config`,
      { context: new HttpContext().set(BYPASS_AUTH_INTERCEPTOR, true) },
    )).catch((error) => { this.configPromise = undefined; throw error; });
  }

  loadIdentity(): Promise<void> {
    return this.loadScript('https://accounts.google.com/gsi/client');
  }

  async preparePicker(): Promise<GoogleConfig> {
    const config = await this.config();
    if (!config.clientId || !config.pickerApiKey || !config.projectNumber) return config;
    await Promise.all([this.loadIdentity(), this.loadScript('https://apis.google.com/js/api.js')]);
    this.pickerReady ??= new Promise<void>((resolve, reject) => {
      const api = (window as unknown as { gapi: {
        load(name: string, options: { callback: () => void; onerror: () => void; timeout: number; ontimeout: () => void }): void;
      } }).gapi;
      const fail = () => reject(new Error('Não foi possível carregar o seletor do Drive.'));
      api.load('picker', { callback: resolve, onerror: fail, timeout: 15000, ontimeout: fail });
    }).catch((error) => { this.pickerReady = undefined; throw error; });
    await this.pickerReady;
    return config;
  }

  // Chamado diretamente pelo clique; não aguardar rede antes de abrir o popup OAuth.
  selectImages(config: GoogleConfig, multiple: boolean): Promise<File[]> {
    return new Promise((resolve, reject) => {
      const client = google.accounts.oauth2.initTokenClient({
        client_id: config.clientId,
        scope: 'https://www.googleapis.com/auth/drive.file',
        include_granted_scopes: false,
        error_callback: (error) => {
          if (error.type === 'popup_closed') resolve([]);
          else reject(new Error('Não foi possível abrir o Google. Permita pop-ups e tente novamente.'));
        },
        callback: (response) => {
          if (response.error || !response.access_token) {
            reject(new Error('O acesso ao Drive não foi autorizado.'));
            return;
          }
          // Keep the picker focused: hide folders/Classroom documents and show owned images only.
          const view = new google.picker.DocsView(google.picker.ViewId.DOCS_IMAGES)
            .setIncludeFolders(false).setSelectFolderEnabled(false).setOwnedByMe(true)
            .setMimeTypes('image/jpeg,image/png,image/webp,image/avif,image/gif,image/tiff,image/bmp,image/svg+xml,image/heic,image/heif');
          const builder = new google.picker.PickerBuilder()
            .addView(view).setOAuthToken(response.access_token)
            .setDeveloperKey(config.pickerApiKey).setAppId(config.projectNumber)
            .setOrigin(window.location.origin).setLocale('pt-BR')
            .setMaxItems(multiple ? 10 : 1)
            .setCallback((data) => {
              if (data.action === google.picker.Action.CANCEL) {
                picker.dispose();
                resolve([]);
              }
              if (data.action === google.picker.Action.PICKED) {
                picker.dispose();
                void this.downloadImages(data.docs ?? [], response.access_token, config.maxFileBytes)
                  .then(resolve, reject);
              }
            });
          builder.enableFeature(google.picker.Feature.NAV_HIDDEN);
          if (multiple) builder.enableFeature(google.picker.Feature.MULTISELECT_ENABLED);
          const picker = builder.build();
          picker.setVisible(true);
        },
      });
      client.requestAccessToken({ prompt: '' });
    });
  }

  private async downloadImages(docs: google.picker.DocumentObject[], token: string, maxBytes: number): Promise<File[]> {
    const files: File[] = [];
    for (const doc of docs) {
      // URL fixa: nunca enviar o token para links retornados pelo arquivo.
      const response = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(doc.id)}?alt=media`, {
        headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(60000),
      });
      if (!response.ok || !response.body) throw new Error('Não foi possível baixar a imagem do Drive. Selecione-a novamente.');
      const reader = response.body.getReader();
      const chunks: Uint8Array<ArrayBuffer>[] = [];
      let size = 0;
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          size += value.byteLength;
          if (size > maxBytes) throw new Error('Esta imagem excede a capacidade de processamento. Exporte uma cópia menor e tente novamente.');
          chunks.push(new Uint8Array(value));
        }
      } finally {
        await reader.cancel();
      }
      const type = (response.headers.get('Content-Type') ?? '').split(';')[0];
      if (!type.startsWith('image/') && !/\.(heic|heif|tiff?|bmp)$/i.test(doc.name || '')) {
        throw new Error('Selecione um arquivo de imagem válido.');
      }
      files.push(new File(chunks, doc.name || 'imagem', { type }));
    }
    return files;
  }

  private loadScript(src: string): Promise<void> {
    const existing = this.scripts.get(src);
    if (existing) return existing;
    const promise = new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      const fail = () => {
        clearTimeout(timer); script.remove(); this.scripts.delete(src);
        reject(new Error('Não foi possível carregar o Google. Verifique sua conexão e tente novamente.'));
      };
      const timer = setTimeout(fail, 15000);
      script.src = src; script.async = true;
      script.onload = () => { clearTimeout(timer); resolve(); };
      script.onerror = fail;
      document.head.appendChild(script);
    });
    this.scripts.set(src, promise);
    return promise;
  }
}
