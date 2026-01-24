import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService
  ) {}

  async login(loginDto: LoginDto) {
    // 1. On cherche l'utilisateur
    const user = await this.usersService.findOneByEmail(loginDto.email);

    // 2. Vérification
    if (!user || !user.passwordHash) { 
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }

    // 3. Comparaison MDP
    const isPasswordValid = await bcrypt.compare(loginDto.password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }

    // 4. RÉCUPÉRATION DU RÔLE
    const userRoles = user['UserRole'] || []; 
    // 👇 CORRECTION ICI : .Role.name (Majuscule R)
    const primaryRole = userRoles.length > 0 ? userRoles[0].Role.name : 'USER';

    // 5. Token
    const payload = { 
      sub: user.id, 
      username: user.username, 
      role: primaryRole 
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatarUrl: user.avatarUrl,
        role: primaryRole
      }
    };
  }
}