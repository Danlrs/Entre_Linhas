import {
  Injectable,
  NotFoundException,
  ConflictException,
  UnauthorizedException,
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
    const { email, login, password, telefone } = createUserDto;

    const existing = await this.usuarioRepository.findOne({
      where: [{ email }, { login }],
    });

    if (existing) {
      if (existing.login === login) throw new ConflictException('Login já cadastrado.');
      throw new ConflictException('E-mail já cadastrado.');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const usuario = this.usuarioRepository.create({
      email,
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
    const user = await this.usuarioRepository.findOne({ where: { login } });
    if (!user) throw new NotFoundException('Usuário não encontrado.');
    return user;
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

    if (dto.login && dto.login !== user.login) {
      const exists = await this.usuarioRepository.findOne({
        where: { login: dto.login, id: Not(id) },
      });
      if (exists) throw new ConflictException('Login já cadastrado.');
      user.login = dto.login;
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
