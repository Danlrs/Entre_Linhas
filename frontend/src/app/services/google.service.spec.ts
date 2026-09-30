import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { GoogleService } from './google.service';

describe('Google Drive image download', () => {
  let service: GoogleService;
  const docs = [{ id: 'a/b', name: 'foto.png' }] as google.picker.DocumentObject[];
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient()] });
    service = TestBed.inject(GoogleService);
  });
  afterEach(() => vi.unstubAllGlobals());

  function response(type: string, bytes: number) {
    const read = vi.fn().mockResolvedValueOnce({ done: false, value: new Uint8Array(bytes) })
      .mockResolvedValue({ done: true });
    const cancel = vi.fn().mockResolvedValue(undefined);
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, headers: new Headers({ 'Content-Type': type }),
      body: { getReader: () => ({ read, cancel }) } });
    vi.stubGlobal('fetch', fetchMock);
    return { fetchMock, cancel };
  }

  it('downloads only from the fixed Google endpoint and returns files for the existing upload', async () => {
    const { fetchMock } = response('image/png', 10);
    const files = await service['downloadImages'](docs, 'drive-token', 100);
    expect(fetchMock).toHaveBeenCalledWith('https://www.googleapis.com/drive/v3/files/a%2Fb?alt=media',
      expect.objectContaining({ headers: { Authorization: 'Bearer drive-token' } }));
    expect(files[0].name).toBe('foto.png');
    expect(files[0].size).toBe(10);
  });

  it('cancels streaming as soon as the size limit is exceeded', async () => {
    const { cancel } = response('image/png', 101);
    await expect(service['downloadImages'](docs, 'token', 100)).rejects.toThrow('capacidade de processamento');
    expect(cancel).toHaveBeenCalled();
  });

  it('rejects unsupported file formats', async () => {
    response('application/pdf', 10);
    await expect(service['downloadImages'](docs, 'token', 100)).rejects.toThrow('arquivo de imagem válido');
  });

  it('reports expired or denied Drive access without returning files', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 403 }));
    await expect(service['downloadImages'](docs, 'expired', 100)).rejects.toThrow('Selecione-a novamente');
  });
});
