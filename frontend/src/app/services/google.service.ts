/// <reference types="google.accounts" />
import { Injectable } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { BYPASS_AUTH_INTERCEPTOR } from '../interceptors/bypass-auth-interceptor-context';

export interface GoogleConfig {
  clientId: string;
}

@Injectable({ providedIn: 'root' })
export class GoogleService {
  private configPromise?: Promise<GoogleConfig>;
  private scripts = new Map<string, Promise<void>>();

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
