import sharp from 'sharp';
import { randomBytes } from 'crypto';
import { validateImageBuffer } from './upload-validation';

describe('Image compression', () => {
  it('compresses an original larger than the old 5 MiB limit below the 1 MiB target', async () => {
    const input = await sharp(randomBytes(1600 * 1600 * 3), { raw: { width: 1600, height: 1600, channels: 3 } }).png().toBuffer();
    expect(input.length).toBeGreaterThan(5 * 1024 * 1024);
    const result = await validateImageBuffer(input, 1024 * 1024);
    expect(result.size).toBeLessThanOrEqual(1024 * 1024);
    expect(result.mimetype).toBe('image/webp');
    expect((await sharp(result.buffer).metadata()).format).toBe('webp');
  }, 30000);

  it.each(['png', 'jpeg', 'tiff', 'avif', 'gif'] as const)('accepts %s and outputs sanitized WebP', async (format) => {
    const input = await sharp({ create: { width: 30, height: 20, channels: 4, background: '#c65353' } })
      .toFormat(format).withMetadata().toBuffer();
    const result = await validateImageBuffer(input, 16384);
    const metadata = await sharp(result.buffer).metadata();
    expect(result.filename).toMatch(/\.webp$/);
    expect(metadata.exif).toBeUndefined();
    expect(metadata.width).toBe(30);
  });

  it('rasterizes SVG instead of storing executable XML', async () => {
    const input = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="30" height="20"><rect width="30" height="20" fill="red"/></svg>');
    const result = await validateImageBuffer(input, 16384);
    expect((await sharp(result.buffer).metadata()).format).toBe('webp');
  });

  it('rejects invalid and empty files', async () => {
    await expect(validateImageBuffer(Buffer.from('not an image'), 16384)).rejects.toThrow('Não foi possível processar');
    await expect(validateImageBuffer(Buffer.alloc(0), 16384)).rejects.toThrow('Arquivo vazio');
  });
});
