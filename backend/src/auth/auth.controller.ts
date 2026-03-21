import {
  Body,
  Controller,
  HttpCode,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

import { CreateUserDto } from '../users/dto/create-user.dto';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterOrganizerDto } from './dto/register-organizer.dto';

interface LogoutRequest {
  headers: {
    authorization?: string;
    'user-agent'?: string;
  };
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() createUserDto: CreateUserDto) {
    return this.authService.register(createUserDto);
  }

  @Post('register/organizer')
  registerOrganizer(@Body() registerOrganizerDto: RegisterOrganizerDto) {
    return this.authService.registerOrganizer(registerOrganizerDto);
  }

  @Post('login')
  login(@Body() loginDto: LoginDto, @Request() req: LogoutRequest) {
    return this.authService.login(loginDto, req.headers['user-agent']);
  }

  @Post('refresh')
  @HttpCode(200)
  refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refresh(refreshTokenDto.refreshToken);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('logout')
  @HttpCode(200)
  logout(@Request() req: LogoutRequest) {
    const authorization = req.headers.authorization;
    const token =
      authorization && authorization.startsWith('Bearer ')
        ? authorization.slice(7)
        : '';

    return this.authService.logout(token);
  }
}
