import { Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { OAuth2Client } from 'google-auth-library';
import { getValidatedEnv } from '../config/env.schema';

@Injectable()
export class GoogleIdentityService {
  private readonly client = new OAuth2Client();

  async verify(credential: string): Promise<string> {
    const { clientId } = getValidatedEnv().google;
    if (!clientId) throw new ServiceUnavailableException('Login Google não configurado.');
    try {
      const ticket = await this.client.verifyIdToken({ idToken: credential, audience: clientId });
      const payload = ticket.getPayload();
      if (!payload?.sub || !payload.email_verified) throw new Error('Invalid identity');
      return payload.sub;
    } catch {
      throw new UnauthorizedException('Não foi possível validar sua conta Google. Tente novamente.');
    }
  }
}
