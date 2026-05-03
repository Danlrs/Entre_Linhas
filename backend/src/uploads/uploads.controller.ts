import {
  Controller,
  Post,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import * as multer from 'multer';
import type { Express } from 'express';
import { Request } from 'express';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { getValidatedEnv } from '../config/env.schema';
import { validateImageBuffer } from './upload-validation';
import { SupabaseStorageService } from './supabase-storage.service';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

/** Alinhado aos defaults EnvSchema THROTTLE_UPLOAD_* */
const UPLOAD_THROTTLE = { ttl: 3_600_000, limit: 60 } as const;

const acceptAnyMime = (_req: unknown, _file: Express.Multer.File, cb: (e: Error | null, ok: boolean) => void) => {
  cb(null, true);
};

function multerLimits() {
  const { uploadMaxFileBytes } = getValidatedEnv();
  return { fileSize: uploadMaxFileBytes };
}

function buildLocalFileUrl(req: Request, folder: string, filename: string): string {
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  return `${baseUrl}/uploads/${folder}/${filename}`;
}

/** Grava arquivo local apenas para desenvolvimento sem Supabase. */
function persistLocal(folder: string, filename: string, buffer: Buffer): void {
  const dir = join(process.cwd(), 'uploads', folder);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, filename), buffer);
}

@UseGuards(JwtAuthGuard, ThrottlerGuard)
@Throttle({ default: { ...UPLOAD_THROTTLE } })
@Controller('uploads')
export class UploadsController {
  constructor(private readonly supabaseStorage: SupabaseStorageService) {}

  @Post('products')
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      storage: multer.memoryStorage(),
      fileFilter: acceptAnyMime,
      limits: multerLimits(),
    }),
  )
  async uploadProductImages(@UploadedFiles() files: Express.Multer.File[], @Req() req: Request) {
    if (!files || files.length === 0) {
      throw new BadRequestException('Nenhum arquivo enviado.');
    }
    const maxBytes = getValidatedEnv().uploadMaxFileBytes;
    const useRemote = this.supabaseStorage.isConfigured();
    const out = [];

    for (const file of files) {
      if (!file.buffer) throw new BadRequestException('Upload inválido.');
      const v = await validateImageBuffer(file.buffer, maxBytes);

      let url: string;
      if (useRemote) {
        url = await this.supabaseStorage.uploadPublicObject('products', v.filename, v.buffer, v.mimetype);
      } else {
        persistLocal('products', v.filename, v.buffer);
        url = buildLocalFileUrl(req, 'products', v.filename);
      }

      out.push({
        url,
        filename: v.filename,
        mimetype: v.mimetype,
        size: v.size,
      });
    }
    return { files: out };
  }

  @Post('estampas')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: multer.memoryStorage(),
      fileFilter: acceptAnyMime,
      limits: multerLimits(),
    }),
  )
  async uploadEstampaImage(@UploadedFile() file: Express.Multer.File, @Req() req: Request) {
    if (!file?.buffer) throw new BadRequestException('Nenhum arquivo enviado.');
    const maxBytes = getValidatedEnv().uploadMaxFileBytes;
    const v = await validateImageBuffer(file.buffer, maxBytes);
    const useRemote = this.supabaseStorage.isConfigured();

    let url: string;
    if (useRemote) {
      url = await this.supabaseStorage.uploadPublicObject('estampas', v.filename, v.buffer, v.mimetype);
    } else {
      persistLocal('estampas', v.filename, v.buffer);
      url = buildLocalFileUrl(req, 'estampas', v.filename);
    }

    return {
      url,
      filename: v.filename,
      mimetype: v.mimetype,
      size: v.size,
    };
  }

  @Post('materiais')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: multer.memoryStorage(),
      fileFilter: acceptAnyMime,
      limits: multerLimits(),
    }),
  )
  async uploadMaterialImage(@UploadedFile() file: Express.Multer.File, @Req() req: Request) {
    if (!file?.buffer) throw new BadRequestException('Nenhum arquivo enviado.');
    const maxBytes = getValidatedEnv().uploadMaxFileBytes;
    const v = await validateImageBuffer(file.buffer, maxBytes);
    const useRemote = this.supabaseStorage.isConfigured();

    let url: string;
    if (useRemote) {
      url = await this.supabaseStorage.uploadPublicObject('materiais', v.filename, v.buffer, v.mimetype);
    } else {
      persistLocal('materiais', v.filename, v.buffer);
      url = buildLocalFileUrl(req, 'materiais', v.filename);
    }

    return {
      url,
      filename: v.filename,
      mimetype: v.mimetype,
      size: v.size,
    };
  }
}
