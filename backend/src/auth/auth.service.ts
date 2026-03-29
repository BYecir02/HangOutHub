import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { LoginDto } from './dto/login.dto';
import { CreateUserDto } from '../users/dto/create-user.dto'; // Import
import { RegisterOrganizerDto } from './dto/register-organizer.dto';
import { PrismaService } from '../prisma/prisma.service';

const ACCESS_TOKEN_TTL_SECONDS = Number(
  process.env.JWT_ACCESS_TOKEN_TTL_SECONDS || 15 * 60,
);
const REFRESH_TOKEN_TTL_SECONDS = Number(
  process.env.JWT_REFRESH_TOKEN_TTL_SECONDS || 30 * 24 * 60 * 60,
);

interface AccessTokenPayload {
  sub: string;
  username: string;
  role: string;
  sid: string;
  type: 'access';
}

interface RefreshTokenPayload {
  sub: string;
  sid: string;
  type: 'refresh';
}

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private prisma: PrismaService, // ✅ Injection de Prisma
  ) {}

  private getPrimaryRole(user: {
    UserRole?: Array<{ Role: { name: string } }>;
  }): string {
    const userRoles = user.UserRole || [];
    return userRoles.length > 0 ? userRoles[0].Role.name : 'USER';
  }

  private getRefreshTokenExpiryDate() {
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + REFRESH_TOKEN_TTL_SECONDS);
    return expiresAt;
  }

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
      instagramUrl,
      tiktokUrl,
      facebookUrl,
      xUrl,
      websiteUrl,
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
      instagramUrl,
      tiktokUrl,
      facebookUrl,
      xUrl,
      websiteUrl,
    };

    return this.usersService.create(userDto, roleName, organizerDetails);
  }

  // Fonction de connexion
  async login(loginDto: LoginDto, device = 'Mobile') {
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

    if (user.isSuspended) {
      throw new ForbiddenException('Compte suspendu');
    }

    const primaryRole = this.getPrimaryRole(user);
    const sessionToken = randomUUID();

    const accessPayload: AccessTokenPayload = {
      sub: user.id,
      username: user.username,
      role: primaryRole,
      sid: sessionToken,
      type: 'access',
    };
    const refreshPayload: RefreshTokenPayload = {
      sub: user.id,
      sid: sessionToken,
      type: 'refresh',
    };

    const accessToken = this.jwtService.sign(accessPayload, {
      expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    });
    const refreshToken = this.jwtService.sign(refreshPayload, {
      expiresIn: REFRESH_TOKEN_TTL_SECONDS,
    });
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);

    const normalizedDevice =
      typeof device === 'string' && device.trim().length > 0
        ? device.trim().slice(0, 100)
        : 'Mobile';

    // 2. Sauvegarder la session active
    await this.prisma.session.create({
      data: {
        userId: user.id,
        token: sessionToken,
        refreshTokenHash,
        expiresAt: this.getRefreshTokenExpiryDate(),
        lastUsedAt: new Date(),
        device: normalizedDevice,
      },
    });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
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

  async refresh(rawRefreshToken: string) {
    if (!rawRefreshToken) {
      throw new UnauthorizedException('Refresh token manquant');
    }

    let payload: RefreshTokenPayload;

    try {
      payload = this.jwtService.verify<RefreshTokenPayload>(rawRefreshToken);
    } catch {
      throw new UnauthorizedException('Refresh token invalide');
    }

    if (payload.type !== 'refresh' || !payload.sid || !payload.sub) {
      throw new UnauthorizedException('Refresh token invalide');
    }

    const session = await this.prisma.session.findUnique({
      where: { token: payload.sid },
      include: {
        User: {
          include: {
            UserRole: {
              include: {
                Role: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const now = new Date();

    if (
      !session ||
      session.userId !== payload.sub ||
      session.revokedAt ||
      !session.refreshTokenHash ||
      (session.expiresAt && session.expiresAt < now)
    ) {
      throw new UnauthorizedException('Session expiree ou invalide');
    }

    if (session.User?.isSuspended) {
      throw new ForbiddenException('Compte suspendu');
    }

    const refreshTokenMatches = await bcrypt.compare(
      rawRefreshToken,
      session.refreshTokenHash,
    );

    if (!refreshTokenMatches || !session.User) {
      throw new UnauthorizedException('Refresh token invalide');
    }

    const role = this.getPrimaryRole(session.User);

    const nextAccessPayload: AccessTokenPayload = {
      sub: session.User.id,
      username: session.User.username,
      role,
      sid: session.token,
      type: 'access',
    };
    const nextRefreshPayload: RefreshTokenPayload = {
      sub: session.User.id,
      sid: session.token,
      type: 'refresh',
    };

    const nextAccessToken = this.jwtService.sign(nextAccessPayload, {
      expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    });
    const nextRefreshToken = this.jwtService.sign(nextRefreshPayload, {
      expiresIn: REFRESH_TOKEN_TTL_SECONDS,
    });

    await this.prisma.session.update({
      where: { id: session.id },
      data: {
        refreshTokenHash: await bcrypt.hash(nextRefreshToken, 10),
        expiresAt: this.getRefreshTokenExpiryDate(),
        lastUsedAt: new Date(),
      },
    });

    return {
      access_token: nextAccessToken,
      refresh_token: nextRefreshToken,
    };
  }

  // ✅ Fonction de déconnexion (Supprime la session)
  async logout(token: string) {
    if (!token) {
      return;
    }

    const decoded: unknown = this.jwtService.decode(token);
    const sessionToken =
      typeof decoded === 'object' &&
      decoded !== null &&
      'sid' in decoded &&
      typeof decoded.sid === 'string' &&
      decoded.sid.trim().length > 0
        ? decoded.sid
        : token;

    // Le .deleteMany evite une erreur si le token n'existe pas deja.
    await this.prisma.session.deleteMany({ where: { token: sessionToken } });
  }
}
