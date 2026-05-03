import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getValidatedEnv } from '../config/env.schema';

@Injectable()
export class SupabaseStorageService {
  private readonly log = new Logger(SupabaseStorageService.name);
  private readonly client: SupabaseClient | null;
  private readonly bucket: string | null;

  constructor() {
    const cfg = getValidatedEnv().supabase;
    if (!cfg) {
      this.client = null;
      this.bucket = null;
      return;
    }
    this.bucket = cfg.bucket;
    this.client = createClient(cfg.url, cfg.serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  /** Quando false, uploads usam `./uploads` + URL própria do backend. */
  isConfigured(): boolean {
    return this.client !== null;
  }

  /**
   * Faz upload e devolve URL pública (bucket precisa estar público ou política liberar leitura).
   */
  async uploadPublicObject(
    folder: string,
    filename: string,
    body: Buffer,
    contentType: string,
  ): Promise<string> {
    if (!this.client || !this.bucket) {
      throw new BadRequestException('Storage Supabase não configurado.');
    }
    const segment = folder.replace(/^\/+|\/+$/g, '');
    const path = `${segment}/${filename}`;

    const { error } = await this.client.storage.from(this.bucket).upload(path, body, {
      contentType,
      upsert: false,
      cacheControl: '604800',
    });

    if (error) {
      this.log.warn(`Supabase Storage: ${error.message}`);
      throw new BadRequestException(`Falha ao enviar imagem: ${error.message}`);
    }

    const { data } = this.client.storage.from(this.bucket).getPublicUrl(path);
    return data.publicUrl;
  }
}
