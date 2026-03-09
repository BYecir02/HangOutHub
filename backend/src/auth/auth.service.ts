import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { CreateUserDto } from '../users/dto/create-user.dto'; // Import
import { RegisterOrganizerDto } from './dto/register-organizer.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private prisma: PrismaService, // ✅ Injection de Prisma
  ) {}

  // Fonction d'inscription
  async register(createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  // Nouvelle fonction pour l'inscription des organisateurs
  async registerOrganizer(registerOrganizerDto: RegisterOrganizerDto) {
    // On extrait les infos spécifiques à l'organisateur

    const {
      accountType,
      companyName,
      ifuNumber,
      payoutInfo,
      jobTitle,
      ...userDto
    } = registerOrganizerDto;

    // Détermination du rôle selon le type de compte
    // PLACE -> PLACE_OWNER (Gérant de lieu)
    // NOMAD -> ORGANIZER (Promoteur d'événements)
    const roleName = accountType === 'PLACE' ? 'PLACE_OWNER' : 'ORGANIZER';

    const organizerDetails = {
      accountType,
      companyName,
      ifuNumber,
      payoutInfo,
      jobTitle,
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

    // 1. Générer le token
    const payload = {
      sub: user.id,
      username: user.username,
      role: primaryRole,
    };
    const token = this.jwtService.sign(payload);

    // 2. ✅ Sauvegarder la session en BDD
    await this.prisma.session.create({
      data: {
        userId: user.id,
        token: token,
        device: 'Mobile', // Tu pourras récupérer le vrai User-Agent plus tard
      },
    });

    return {
      access_token: token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatarUrl: user.avatarUrl,
        role: primaryRole,
        // ✅ Infos vitales pour le Dashboard Organisateur
        organizerStatus: user.OrganizerProfile?.status,
        companyName: user.OrganizerProfile?.companyName,
        hasPlace: user.OwnedPlaces && user.OwnedPlaces.length > 0, // ✅ Indique si le lieu est déjà créé
      },
    };
  }

  // ✅ Fonction de déconnexion (Supprime la session)
  async logout(token: string) {
    // On supprime la session qui correspond à ce token
    // Le .deleteMany évite une erreur si le token n'existe pas déjà
    await this.prisma.session.deleteMany({ where: { token } });
  }
}
