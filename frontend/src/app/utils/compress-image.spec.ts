import { compressImage } from './compress-image';

describe('Device image compression', () => {
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  it('resizes a large photo and exports WebP before upload', async () => {
    const close = vi.fn();
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue({ width: 6000, height: 4000, close }));
    const draw = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage: draw } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (this: HTMLCanvasElement, callback) {
      expect(this.width).toBe(2048);
      expect(this.height).toBe(1365);
      callback(new Blob(['compressed pixels'], { type: 'image/webp' }));
    });
    const output = await compressImage(new File(['original'], 'foto.jpg', { type: 'image/jpeg' }));
    expect(output.name).toBe('foto.webp');
    expect(output.type).toBe('image/webp');
    expect(close).toHaveBeenCalled();
  });

  it('forwards images unsupported by the browser to server-side conversion', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn().mockRejectedValue(new Error('unsupported HEIC')));
    const file = new File(['heic content'], 'foto.heic', { type: 'image/heic' });
    expect(await compressImage(file)).toBe(file);
  });
});
