import { Controller, Post, UploadedFile, UploadedFiles, UseGuards, UseInterceptors, Req, BadRequestException } from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import * as multer from 'multer';
import type { Express, Request } from 'express';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { getValidatedEnv } from '../config/env.schema';
import { validateImageBuffer } from './upload-validation';
import { SupabaseStorageService } from './supabase-storage.service';
import { mkdir, readFile, unlink, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomUUID } from 'crypto';

// Arquivos originais ficam temporariamente no disco, não todos na memória do Render.
const uploadOptions = {
  storage: multer.diskStorage({
    destination: tmpdir(),
    filename: (_req, _file, done) => done(null, `entrelinhas-${randomUUID()}`),
  }),
  limits: { fileSize: getValidatedEnv().uploadMaxInputBytes },
};

@UseGuards(JwtAuthGuard, ThrottlerGuard)
@Throttle({ default: { ttl: 3_600_000, limit: 60 } })
@Controller('uploads')
export class UploadsController {
  constructor(private readonly supabaseStorage: SupabaseStorageService) {}

  @Post('products')
  @UseInterceptors(FilesInterceptor('files', 10, uploadOptions))
  async uploadProductImages(@UploadedFiles() files: Express.Multer.File[], @Req() req: Request) {
    if (!files?.length) throw new BadRequestException('Nenhum arquivo enviado.');
    try {
      const out = [];
      for (const file of files) out.push(await this.persist('products', file, req));
      return { files: out };
    } finally { await this.cleanup(files); }
  }

  @Post('estampas')
  @UseInterceptors(FileInterceptor('file', uploadOptions))
  async uploadEstampaImage(@UploadedFile() file: Express.Multer.File, @Req() req: Request) {
    return this.single('estampas', file, req);
  }

  @Post('materiais')
  @UseInterceptors(FileInterceptor('file', uploadOptions))
  async uploadMaterialImage(@UploadedFile() file: Express.Multer.File, @Req() req: Request) {
    return this.single('materiais', file, req);
  }

  private async single(folder: string, file: Express.Multer.File, req: Request) {
    if (!file) throw new BadRequestException('Nenhum arquivo enviado.');
    try { return await this.persist(folder, file, req); }
    finally { await this.cleanup([file]); }
  }

  private async persist(folder: string, file: Express.Multer.File, req: Request) {
    const input = await readFile(file.path);
    const v = await validateImageBuffer(input, getValidatedEnv().imageTargetBytes);
    let url: string;
    if (this.supabaseStorage.isConfigured()) {
      url = await this.supabaseStorage.uploadPublicObject(folder, v.filename, v.buffer, v.mimetype);
    } else {
      const directory = join(process.cwd(), 'uploads', folder);
      await mkdir(directory, { recursive: true });
      await writeFile(join(directory, v.filename), v.buffer);
      url = `${req.protocol}://${req.get('host')}/uploads/${folder}/${v.filename}`;
    }
    return { url, filename: v.filename, mimetype: v.mimetype, size: v.size };
  }

  private async cleanup(files: Express.Multer.File[]) {
    await Promise.all(files.map((file) => unlink(file.path).catch(() => undefined)));
  }
}
