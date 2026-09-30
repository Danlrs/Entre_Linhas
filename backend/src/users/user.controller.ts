import { Body, Controller, Get, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { UserService } from './user.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserInvitationService } from './user-invitation.service';
import { InviteUserDto } from './dto/invite-user.dto';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';

interface JwtPayload {
  sub: number;
  login: string;
}

@Controller('usuario')
export class UserController {
  constructor(private readonly userService: UserService, private readonly invitations: UserInvitationService) {}

  @UseGuards(JwtAuthGuard, ThrottlerGuard)
  @Throttle({ default: { ttl: 3_600_000, limit: 5 } })
  @Post('convites')
  inviteUser(@Body() dto: InviteUserDto, @Req() req: Request) {
    return this.invitations.invite(dto.email, req.headers.origin ?? '');
  }

  @Get('convites/validar')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { ttl: 600_000, limit: 30 } })
  validateInvitation(@Query('token') token: string) {
    return this.invitations.getInvitation(token ?? '');
  }

  @Post('convites/aceitar')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { ttl: 600_000, limit: 10 } })
  acceptInvitation(@Body() dto: AcceptInvitationDto) {
    return this.invitations.accept(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('eu')
  getMe(@Req() req: Request) {
    const user = req['user'] as JwtPayload;
    return this.userService.getUserById(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('eu')
  updateMe(@Req() req: Request, @Body() dto: UpdateUserDto) {
    const user = req['user'] as JwtPayload;
    return this.userService.updateUser(user.sub, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('eu/senha')
  changePassword(@Req() req: Request, @Body() dto: ChangePasswordDto) {
    const user = req['user'] as JwtPayload;
    return this.userService.changePassword(user.sub, dto);
  }
}
