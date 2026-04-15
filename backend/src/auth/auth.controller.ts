import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  ParseUUIDPipe,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

import { CreateUserDto } from '../users/dto/create-user.dto';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { RequestEmailVerificationDto } from './dto/request-email-verification.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterOrganizerDto } from './dto/register-organizer.dto';
import { ResetPasswordOtpDto } from './dto/reset-password-otp.dto';
import { VerifyPasswordResetDto } from './dto/verify-password-reset.dto';
import { VerifyEmailOtpDto } from './dto/verify-email-otp.dto';

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

  @Get('verify-email')
  verifyEmail(@Query('token') token: string) {
    return this.authService.verifyEmailToken(token);
  }

  @Post('verify-email/otp')
  verifyEmailOtp(@Body() dto: VerifyEmailOtpDto) {
    return this.authService.verifyEmailOtp(dto.email, dto.code);
  }

  @Post('verify-email/request')
  requestVerifyEmail(@Body() dto: RequestEmailVerificationDto) {
    return this.authService.requestEmailVerification(dto.email);
  }

  @Post('password-reset/request')
  requestPasswordReset(@Body() dto: RequestPasswordResetDto) {
    return this.authService.requestPasswordReset(dto.email);
  }

  @Post('password-reset/verify')
  verifyPasswordReset(@Body() dto: VerifyPasswordResetDto) {
    return this.authService.verifyPasswordResetOtp(dto.email, dto.code);
  }

  @Post('password-reset/confirm')
  confirmPasswordReset(@Body() dto: ResetPasswordOtpDto) {
    return this.authService.resetPasswordOtp(dto.email, dto.code, dto.password);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('verify-email/resend')
  resendVerifyEmail(
    @Request() req: LogoutRequest & { user: { userId: string } },
  ) {
    return this.authService.resendEmailVerification(req.user.userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('sessions')
  listSessions(@Request() req: LogoutRequest & { user: { userId: string } }) {
    return this.authService.listSessions(
      req.user.userId,
      req.headers.authorization,
    );
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete('sessions/others')
  revokeOtherSessions(
    @Request() req: LogoutRequest & { user: { userId: string } },
  ) {
    return this.authService.revokeOtherSessions(
      req.user.userId,
      req.headers.authorization,
    );
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete('sessions/:id')
  revokeSession(
    @Param('id', ParseUUIDPipe) sessionId: string,
    @Request() req: LogoutRequest & { user: { userId: string } },
  ) {
    return this.authService.revokeSession(req.user.userId, sessionId);
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
