import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { OAuth2Client } from 'google-auth-library';
import { isEmail } from 'class-validator';
import { getValidatedEnv } from '../config/env.schema';

@Injectable()
export class RecoveryMailService {
  assertConfigured(): void {
    const cfg = getValidatedEnv().gmail;
    if (!cfg.clientId || !cfg.clientSecret || !cfg.refreshToken) {
      throw new ServiceUnavailableException('Recuperação de senha indisponível no momento. Entre em contato com o suporte.');
    }
  }

  async sendCode(email: string, code: string): Promise<void> {
    this.assertConfigured();
    // Defesa também contra injeção de cabeçalhos em registros legados.
    if (!isEmail(email) || /[\r\n]/.test(email)) throw new Error('Invalid recipient');
    const cfg = getValidatedEnv().gmail;
    const client = new OAuth2Client(cfg.clientId, cfg.clientSecret);
    client.transporter.defaults.timeout = 15000;
    client.setCredentials({ refresh_token: cfg.refreshToken });
    const body = `Seu código de recuperação de senha do Entre Linhas é: ${code}\n\n` +
      'O código expira em 10 minutos. Não compartilhe este código.\n' +
      'Se você não solicitou a recuperação, ignore esta mensagem. Sua senha continua a mesma.';
    const mime = [
      `From: Entre Linhas <${cfg.sender}>`, `To: ${email}`,
      'Subject: Codigo de recuperacao de senha - Entre Linhas',
      'MIME-Version: 1.0', 'Content-Type: text/plain; charset=UTF-8',
      'Content-Transfer-Encoding: base64', '', Buffer.from(body).toString('base64'),
    ].join('\r\n');
    // HTTPS funciona no Render gratuito. Nunca registrar o erro OAuth completo (contém segredos).
    await client.request({
      url: `https://gmail.googleapis.com/gmail/v1/users/${encodeURIComponent(cfg.sender)}/messages/send`,
      method: 'POST', data: { raw: Buffer.from(mime).toString('base64url') },
      timeout: 15000, retry: false,
    });
  }

  async sendInvitation(email: string, inviteUrl: string): Promise<void> {
    this.assertConfigured();
    if (!isEmail(email) || /[\r\n]/.test(email)) throw new Error('Invalid recipient');
    const cfg = getValidatedEnv().gmail;
    const client = new OAuth2Client(cfg.clientId, cfg.clientSecret);
    client.transporter.defaults.timeout = 15000;
    client.setCredentials({ refresh_token: cfg.refreshToken });
    const body = `Você recebeu um convite para criar seu acesso ao Entre Linhas.\n\n` +
      `Use o link abaixo para escolher seu login, senha e telefone. O convite é válido por 48 horas e só pode ser usado uma vez.\n\n${inviteUrl}\n\n` +
      'Se você não esperava este convite, ignore esta mensagem.';
    const mime = [
      `From: Entre Linhas <${cfg.sender}>`, `To: ${email}`,
      'Subject: Convite para acessar o Entre Linhas',
      'MIME-Version: 1.0', 'Content-Type: text/plain; charset=UTF-8',
      'Content-Transfer-Encoding: base64', '', Buffer.from(body).toString('base64'),
    ].join('\r\n');
    await client.request({
      url: `https://gmail.googleapis.com/gmail/v1/users/${encodeURIComponent(cfg.sender)}/messages/send`,
      method: 'POST', data: { raw: Buffer.from(mime).toString('base64url') }, timeout: 15000, retry: false,
    });
  }
}
