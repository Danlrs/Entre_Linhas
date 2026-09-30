import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { Usuario } from '../entities/usuario.entity';
import { UserInvitation } from '../entities/user-invitation.entity';
import { UserInvitationService } from './user-invitation.service';
import { RecoveryMailService } from '../auth/recovery-mail.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Usuario, UserInvitation]),
  ],
  controllers: [UserController],
  providers: [UserService, UserInvitationService, RecoveryMailService],
  exports: [UserService, UserInvitationService],
})
export class UserModule {}
