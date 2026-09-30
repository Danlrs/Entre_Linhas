import {
  Injectable,
  NotFoundException,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { Usuario } from '../entities/usuario.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import * as bcrypt from 'bcrypt';

type SafeUser = Omit<Usuario, 'password'>;

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
  ) {}

  async createUser(createUserDto: CreateUserDto): Promise<SafeUser> {
    const { email, password, telefone } = createUserDto;
    const login = createUserDto.login.trim().toLowerCase();
    if (!/^[a-z0-9_.]{3,50}$/.test(login)) {
      throw new BadRequestException('Use de 3 a 50 caracteres no login: letras, números, _ ou ponto. Não use espaços.');
    }
    const nome = createUserDto.nome.trim();

    const existing = await this.usuarioRepository.createQueryBuilder('user')
      .where('LOWER(user.email) = :email OR LOWER(user.login) = :login', {
        email: email.trim().toLowerCase(), login,
      }).getOne();

    if (existing) {
      if (existing.login === login) throw new ConflictException('Login já cadastrado.');
      throw new ConflictException('E-mail já cadastrado.');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const usuario = this.usuarioRepository.create({
      email: email.trim().toLowerCase(),
      nome,
      login,
      password: hashedPassword,
      telefone: telefone ?? null,
    });

    const saved = await this.usuarioRepository.save(usuario);
    return this.stripPassword(saved);
  }

  async getAllUsers(): Promise<SafeUser[]> {
    const users = await this.usuarioRepository.find();
    return users.map((u) => this.stripPassword(u));
  }

  async getUserByLogin(login: string): Promise<Usuario> {
    const user = await this.usuarioRepository.createQueryBuilder('user')
      .where('LOWER(user.login) = :login', { login: login.trim().toLowerCase() }).getOne();
    if (!user) throw new NotFoundException('Usuário não encontrado.');
    return user;
  }

  async findByIdentifier(identifier: string): Promise<Usuario | null> {
    const matches = await this.usuarioRepository.createQueryBuilder('user')
      .where('LOWER(user.login) = :login OR LOWER(user.email) = :email', {
        login: identifier.trim().toLowerCase(), email: identifier.trim().toLowerCase(),
      }).take(2).getMany();
    // Nunca escolher arbitrariamente entre um login e o e-mail de outra conta.
    return matches.length === 1 ? matches[0] : null;
  }

  async findByGoogleSubject(googleSubject: string): Promise<Usuario | null> {
    return this.usuarioRepository.findOne({ where: { googleSubject } });
  }

  async linkGoogle(id: number, googleSubject: string): Promise<{ ok: true }> {
    try {
      const result = await this.usuarioRepository.createQueryBuilder().update(Usuario)
        .set({ googleSubject })
        .where('id = :id AND (google_subject IS NULL OR google_subject = :subject)', {
          id, subject: googleSubject,
        }).execute();
      if (!result.affected) throw new ConflictException('Sua conta já possui outro Google vinculado.');
      return { ok: true };
    } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        throw new ConflictException('Esta conta Google já está vinculada a outro usuário.');
      }
      throw error;
    }
  }

  async getUserById(id: number): Promise<SafeUser> {
    const user = await this.usuarioRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Usuário não encontrado.');
    return this.stripPassword(user);
  }

  async updateUser(id: number, dto: UpdateUserDto): Promise<SafeUser> {
    const user = await this.usuarioRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Usuário não encontrado.');

    if (dto.email && dto.email !== user.email) {
      const exists = await this.usuarioRepository.findOne({
        where: { email: dto.email, id: Not(id) },
      });
      if (exists) throw new ConflictException('E-mail já cadastrado.');
      user.email = dto.email;
    }

    if (dto.nome !== undefined) {
      const nome = dto.nome.trim();
      if (!nome) throw new ConflictException('Informe seu nome.');
      user.nome = nome;
    }

    if (dto.telefone !== undefined) {
      const trimmed = dto.telefone?.trim();
      const newPhone = trimmed ? trimmed : null;

      if (newPhone && newPhone !== user.telefone) {
        const exists = await this.usuarioRepository.findOne({
          where: { telefone: newPhone, id: Not(id) },
        });
        if (exists) throw new ConflictException('Telefone já cadastrado.');
      }

      user.telefone = newPhone;
    }

    const saved = await this.usuarioRepository.save(user);
    return this.stripPassword(saved);
  }

  async changePassword(id: number, dto: ChangePasswordDto): Promise<{ message: string }> {
    const user = await this.usuarioRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Usuário não encontrado.');

    const isValid = await bcrypt.compare(dto.currentPassword, user.password);
    if (!isValid) throw new UnauthorizedException('Senha atual incorreta.');

    user.password = await bcrypt.hash(dto.newPassword, 10);
    await this.usuarioRepository.save(user);

    return { message: 'Senha alterada com sucesso.' };
  }

  private stripPassword(user: Usuario): SafeUser {
    const { password: _password, ...rest } = user;
    return rest;
  }
}
