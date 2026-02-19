import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { CreateUserDto } from '../users/dto/create-user.dto'; // Import
import { RegisterOrganizerDto } from './dto/register-organizer.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  // Fonction d'inscription
  async register(createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  // Nouvelle fonction pour l'inscription des organisateurs
  async registerOrganizer(registerOrganizerDto: RegisterOrganizerDto) {
    // On extrait les infos spécifiques à l'organisateur
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { accountType, companyName, ifuNumber, payoutInfo, jobTitle, ...userDto } = registerOrganizerDto;

    // Détermination du rôle selon le type de compte
    // PLACE -> PLACE_OWNER (Gérant de lieu)
    // NOMAD -> ORGANIZER (Promoteur d'événements)
    const roleName = accountType === 'PLACE' ? 'PLACE_OWNER' : 'ORGANIZER';

    const organizerDetails = {
      accountType, companyName, ifuNumber, payoutInfo, jobTitle
    };

    return this.usersService.create(userDto, roleName, organizerDetails);
  }

  // Fonction de connexion
  async login(loginDto: LoginDto) {
    const user = await this.usersService.findOneByEmail(loginDto.email);

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }

    const userRoles = user['UserRole'] || [];
    const primaryRole = userRoles.length > 0 ? userRoles[0].Role.name : 'USER';

    const payload = {
      sub: user.id,
      username: user.username,
      role: primaryRole,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatarUrl: user.avatarUrl,
        role: primaryRole,
      },
    };
  }
}
