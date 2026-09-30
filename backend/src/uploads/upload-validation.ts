import { randomUUID } from 'crypto';
import { BadRequestException } from '@nestjs/common';
import sharp from 'sharp';
import { fromBuffer } from 'file-type';
import heicConvert from 'heic-convert';

sharp.cache({ memory: 8, files: 0, items: 16 });
sharp.concurrency(1);
const MAX_PIXELS = 50_000_000;
export type ValidatedImage = { filename: string; mimetype: string; size: number; buffer: Buffer };

/** Decodifica pixels reais, aplica orientação e remove metadados. Nunca publica o original. */
export async function validateImageBuffer(input: Buffer, targetBytes: number): Promise<ValidatedImage> {
  if (!input?.length) throw new BadRequestException('Arquivo vazio.');
  let source = input;
  try {
    const detected = await fromBuffer(input);
    if (detected && ['image/heic', 'image/heif'].includes(detected.mime)) {
      const metadata = await sharp(input, { limitInputPixels: MAX_PIXELS }).metadata();
      if (!metadata.width || !metadata.height || metadata.width * metadata.height > MAX_PIXELS) {
        throw new Error('Image dimensions exceed processing capacity');
      }
      source = Buffer.from(await heicConvert({ buffer: input, format: 'JPEG', quality: 0.9 }));
    }
    // Animações viram uma foto estática (primeiro quadro).
    const pipeline = sharp(source, { limitInputPixels: MAX_PIXELS, animated: false, failOn: 'error' }).rotate();
    for (const edge of [2048, 1600, 1200, 900, 600, 400, 200]) {
      for (const quality of [82, 65, 45]) {
        const buffer = await pipeline.clone().resize({ width: edge, height: edge, fit: 'inside', withoutEnlargement: true })
          .webp({ quality, effort: 3 }).timeout({ seconds: 20 }).toBuffer();
        if (buffer.length <= targetBytes) {
          return { buffer, size: buffer.length, filename: `${randomUUID()}.webp`, mimetype: 'image/webp' };
        }
      }
    }
    throw new BadRequestException('Não foi possível otimizar esta imagem. Tente outra foto.');
  } catch (error) {
    if (error instanceof BadRequestException) throw error;
    throw new BadRequestException('Não foi possível processar esta imagem. Use uma foto válida (JPEG, PNG, WebP, AVIF, GIF, TIFF, SVG ou HEIC/HEIF), com até 50 megapixels.');
  }
}
