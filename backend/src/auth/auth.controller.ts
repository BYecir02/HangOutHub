import { Controller, Post, Body, UseGuards, Request, HttpCode } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { CreateUserDto } from '../users/dto/create-user.dto'; // N'oublie pas l'import !
import { RegisterOrganizerDto } from './dto/register-organizer.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ✅ Route pour s'inscrire (Celle qui manquait)
  @Post('register')
  register(@Body() createUserDto: CreateUserDto) {
    return this.authService.register(createUserDto);
  }

  // ✅ Nouvelle route pour les organisateurs/pros
  @Post('register/organizer')
  registerOrganizer(@Body() registerOrganizerDto: RegisterOrganizerDto) {
    return this.authService.registerOrganizer(registerOrganizerDto);
  }

  // ✅ Route pour se connecter (Ton code existant)
  @Post('login')
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  // ✅ Route de déconnexion
  @UseGuards(AuthGuard('jwt'))
  @Post('logout')
  @HttpCode(200)
  logout(@Request() req: any) {
    // On récupère le token depuis le header Authorization
    const token = req.headers.authorization?.split(' ')[1];
    return this.authService.logout(token);
  }
}
