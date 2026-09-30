import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { GoogleIdentityService } from './google-identity.service';
import { UserModule } from '../users/user.module';
import { RefreshToken } from '../entities/refresh-token.entity';
import { PasswordReset } from '../entities/password-reset.entity';
import { PasswordRecoveryService } from './password-recovery.service';
import { RecoveryMailService } from './recovery-mail.service';

@Module({
  imports: [UserModule, TypeOrmModule.forFeature([RefreshToken, PasswordReset])],
  controllers: [AuthController],
  providers: [AuthService, GoogleIdentityService, PasswordRecoveryService, RecoveryMailService],
})
export class AuthModule {}
