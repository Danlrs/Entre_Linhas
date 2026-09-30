import { OAuth2Client } from 'google-auth-library';
import { GoogleIdentityService } from './google-identity.service';

jest.mock('../config/env.schema', () => ({ getValidatedEnv: () => ({ google: { clientId: 'our-client' } }) }));

describe('GoogleIdentityService', () => {
  afterEach(() => jest.restoreAllMocks());

  it('verifies signature, issuer, expiry and the configured audience through the official library', async () => {
    const verify = jest.spyOn(OAuth2Client.prototype, 'verifyIdToken')
      .mockResolvedValue({ getPayload: () => ({ sub: 'stable-sub', email_verified: true }) } as never);
    await expect(new GoogleIdentityService().verify('credential')).resolves.toBe('stable-sub');
    expect(verify).toHaveBeenCalledWith({ idToken: 'credential', audience: 'our-client' });
  });

  it('rejects invalid tokens', async () => {
    jest.spyOn(OAuth2Client.prototype, 'verifyIdToken').mockRejectedValue(new Error('invalid audience') as never);
    await expect(new GoogleIdentityService().verify('invalid')).rejects.toThrow('Não foi possível validar');
  });

  it('rejects unverified identities', async () => {
    jest.spyOn(OAuth2Client.prototype, 'verifyIdToken')
      .mockResolvedValue({ getPayload: () => ({ sub: 'sub', email_verified: false }) } as never);
    await expect(new GoogleIdentityService().verify('credential')).rejects.toThrow('Não foi possível validar');
  });
});
