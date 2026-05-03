import { randomUUID } from 'crypto';
import { BadRequestException } from '@nestjs/common';
import { fromBuffer } from 'file-type';

/** Keep only browser-rasterizable web images (no SVG/script surface). */
export const ALLOWED_IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const EXT_MAP: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export type ValidatedImage = {
  filename: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

/** Valida por assinatura mágica (buffer); nome final seguro UUID + extensão real. */
export async function validateImageBuffer(buffer: Buffer, maxBytes: number): Promise<ValidatedImage> {
  if (!buffer?.length) {
    throw new BadRequestException('Arquivo vazio.');
  }

  if (buffer.length > maxBytes) {
    throw new BadRequestException(`Arquivo acima do limite (${maxBytes} bytes).`);
  }

  const detected = await fromBuffer(buffer);
  const mime = detected?.mime;
  if (!mime || !ALLOWED_IMAGE_MIMES.has(mime)) {
    throw new BadRequestException(
      'Imagem inválida. Envie apenas JPEG, PNG ou WebP (assinatura do arquivo não corresponde).',
    );
  }

  const ext = EXT_MAP[mime] ?? detected?.ext;
  if (!ext) {
    throw new BadRequestException('Tipo de imagem não suportado.');
  }

  return {
    filename: `${randomUUID()}.${ext}`,
    mimetype: mime,
    size: buffer.length,
    buffer,
  };
}
