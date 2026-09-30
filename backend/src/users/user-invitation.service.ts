import { BadRequestException, ConflictException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';
import { DataSource, Repository } from 'typeorm';
import { Usuario } from '../entities/usuario.entity';
import { UserInvitation } from '../entities/user-invitation.entity';
import { RecoveryMailService } from '../auth/recovery-mail.service';
import { getValidatedEnv } from '../config/env.schema';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

@Injectable()
export class UserInvitationService {
  constructor(
    @InjectRepository(UserInvitation) private readonly invitations: Repository<UserInvitation>,
    @InjectRepository(Usuario) private readonly users: Repository<Usuario>,
    private readonly dataSource: DataSource,
    private readonly mail: RecoveryMailService,
  ) {}

  async invite(emailInput: string, origin: string): Promise<{ ok: true }> {
    const email = emailInput.trim().toLowerCase();
    const allowedOrigins = getValidatedEnv().cors.origins;
    if (!allowedOrigins.includes(origin)) throw new ConflictException('Origem do convite não autorizada.');
    if (await this.users.createQueryBuilder('user').where('LOWER(user.email) = :email', { email }).getOne()) {
      throw new ConflictException('Já existe uma conta com este e-mail.');
    }

    const token = randomBytes(32).toString('base64url');
    await this.invitations.createQueryBuilder().delete().where('email = :email AND accepted_at IS NULL', { email }).execute();
    const invite = this.invitations.create({ email, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000), acceptedAt: null });
    await this.invitations.save(invite);
    try {
      await this.mail.sendInvitation(email, `${origin}/cadastro/convite?token=${encodeURIComponent(token)}`);
    } catch {
      await this.invitations.delete({ id: invite.id });
      throw new ServiceUnavailableException('Não foi possível enviar o convite. Tente novamente mais tarde.');
    }
    return { ok: true };
  }

  async getInvitation(token: string): Promise<{ email: string }> {
    const invite = await this.invitations.findOne({ where: { tokenHash: hashToken(token), acceptedAt: null } });
    if (!invite || invite.expiresAt.getTime() <= Date.now()) throw new NotFoundException('Este convite expirou ou já foi utilizado. Solicite um novo convite.');
    return { email: invite.email };
  }

  async accept(dto: AcceptInvitationDto): Promise<{ ok: true }> {
    if (dto.password !== dto.confirmPassword) throw new BadRequestException('As senhas não coincidem.');
    const tokenHash = hashToken(dto.token);
    const login = dto.login.trim().toLowerCase();
    if (!/^[a-z0-9_.]{3,50}$/.test(login)) {
      throw new BadRequestException('Use de 3 a 50 caracteres no login: letras, números, _ ou ponto. Não use espaços.');
    }
    const nome = dto.nome.trim();
    if (!nome) throw new BadRequestException('Informe seu nome.');
    await this.dataSource.transaction(async (manager) => {
      const invite = await manager.getRepository(UserInvitation).createQueryBuilder('invite')
        .setLock('pessimistic_write')
        .where('invite.token_hash = :tokenHash AND invite.accepted_at IS NULL AND invite.expires_at > NOW()', { tokenHash })
        .getOne();
      if (!invite) throw new NotFoundException('Este convite expirou ou já foi utilizado. Solicite um novo convite.');
      const users = manager.getRepository(Usuario);
      if (await users.createQueryBuilder('user')
        .where('LOWER(user.email) = :email OR LOWER(user.login) = :login OR user.telefone = :telefone', {
          email: invite.email, login, telefone: dto.telefone,
        }).getOne()) {
        throw new ConflictException('E-mail, login ou telefone já cadastrado.');
      }
      const user = users.create({ email: invite.email, nome, login, password: await bcrypt.hash(dto.password, 10), telefone: dto.telefone, googleSubject: null });
      await users.save(user);
      invite.acceptedAt = new Date();
      await manager.getRepository(UserInvitation).save(invite);
    });
    return { ok: true };
  }
}
