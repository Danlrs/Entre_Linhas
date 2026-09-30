import { OAuth2Client } from 'google-auth-library';
import { RecoveryMailService } from './recovery-mail.service';

jest.mock('../config/env.schema', () => ({ getValidatedEnv: () => ({ gmail: {
  clientId: 'client', clientSecret: 'secret', refreshToken: 'refresh', sender: 'contato.entrelinhaslrs@gmail.com',
} }) }));

describe('Recovery mail', () => {
  afterEach(() => jest.restoreAllMocks());

  it('sends MIME mail from the authorized mailbox over HTTPS with a six digit code', async () => {
    const request = jest.spyOn(OAuth2Client.prototype, 'request').mockResolvedValue({ data: {} } as never);
    await new RecoveryMailService().sendCode('user@example.com', '123456');
    const options = request.mock.calls[0][0] as { url: string; method: string; data: { raw: string } };
    expect(options.url).toBe('https://gmail.googleapis.com/gmail/v1/users/contato.entrelinhaslrs%40gmail.com/messages/send');
    expect(options.method).toBe('POST');
    const mime = Buffer.from(options.data.raw, 'base64url').toString();
    expect(mime).toContain('From: Entre Linhas <contato.entrelinhaslrs@gmail.com>');
    expect(mime).toContain('To: user@example.com');
    const body = Buffer.from(mime.split('\r\n\r\n')[1], 'base64').toString();
    expect(body).toContain('123456');
    expect(body).toContain('10 minutos');
  });

  it('rejects header injection before sending', async () => {
    const request = jest.spyOn(OAuth2Client.prototype, 'request');
    await expect(new RecoveryMailService().sendCode('user@example.com\r\nBcc: attacker@example.com', '123456')).rejects.toThrow('Invalid recipient');
    expect(request).not.toHaveBeenCalled();
  });
});
