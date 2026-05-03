import { Body, Controller, Get, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

interface JwtPayload {
  sub: number;
  login: string;
}

@Controller('usuario')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('cadastro')
  registerUser(@Body() dto: CreateUserDto) {
    return this.userService.createUser(dto);
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
