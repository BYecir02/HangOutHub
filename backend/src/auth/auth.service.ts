import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash, randomUUID } from 'crypto';
import { LoginDto } from './dto/login.dto';
import { CreateUserDto } from '../users/dto/create-user.dto'; // Import
import { RegisterOrganizerDto } from './dto/register-organizer.dto';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';

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

interface DecodedSessionToken {
  sid?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private prisma: PrismaService,
    private emailService: EmailService,
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
    const user = await this.usersService.create(createUserDto);

    if (user?.email) {
      await this.sendVerificationOtp(user.id, user.email, user.username);
    }

    return user;
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

    const user = await this.usersService.create(
      userDto,
      roleName,
      organizerDetails,
    );

    if (user?.email) {
      await this.sendVerificationOtp(user.id, user.email, user.username);
    }

    return user;
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

    const normalizedDevice = this.formatDeviceLabel(device);

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
        emailVerifiedAt: user.emailVerifiedAt ?? null,
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

    const sessionToken = this.extractSessionToken(token);

    // Le .deleteMany evite une erreur si le token n'existe pas deja.
    await this.prisma.session.deleteMany({ where: { token: sessionToken } });
  }

  async listSessions(userId: string, authorization?: string) {
    const currentSessionToken =
      this.extractSessionTokenFromAuthorization(authorization);
    const now = new Date();

    const sessions = await this.prisma.session.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        token: true,
        device: true,
        createdAt: true,
        lastUsedAt: true,
        expiresAt: true,
        revokedAt: true,
      },
    });

    return sessions.map((session) => ({
      id: session.id,
      device: this.formatDeviceLabel(session.device),
      createdAt: session.createdAt,
      lastUsedAt: session.lastUsedAt,
      expiresAt: session.expiresAt,
      revokedAt: session.revokedAt,
      isCurrent: currentSessionToken
        ? session.token === currentSessionToken
        : false,
      isActive:
        !session.revokedAt &&
        (!session.expiresAt || session.expiresAt.getTime() > now.getTime()),
    }));
  }

  async revokeSession(userId: string, sessionId: string) {
    const session = await this.prisma.session.findFirst({
      where: {
        id: sessionId,
        userId,
      },
      select: {
        id: true,
      },
    });

    if (!session) {
      throw new UnauthorizedException('Session introuvable');
    }

    await this.prisma.session.update({
      where: { id: session.id },
      data: {
        revokedAt: new Date(),
        refreshTokenHash: null,
      },
    });

    return {
      success: true,
      id: session.id,
    };
  }

  async revokeOtherSessions(userId: string, authorization?: string) {
    const currentSessionToken =
      this.extractSessionTokenFromAuthorization(authorization);

    if (!currentSessionToken) {
      throw new UnauthorizedException('Session active introuvable');
    }

    await this.prisma.session.updateMany({
      where: {
        userId,
        token: {
          not: currentSessionToken,
        },
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
        refreshTokenHash: null,
      },
    });

    return {
      success: true,
    };
  }

  private extractSessionToken(rawToken: string) {
    const decoded = this.jwtService.decode(rawToken) as
      | DecodedSessionToken
      | null;
    const sid = decoded?.sid?.trim();
    return sid ? sid : rawToken;
  }

  private extractSessionTokenFromAuthorization(authorization?: string) {
    if (!authorization || !authorization.startsWith('Bearer ')) {
      return null;
    }

    return this.extractSessionToken(authorization.slice(7));
  }

  private formatDeviceLabel(device?: string | null) {
    const raw = typeof device === 'string' ? device.trim() : '';
    if (!raw) {
      return 'Appareil inconnu';
    }

    const browser =
      raw.includes('Edg/') || raw.includes('Edge/')
        ? 'Edge'
        : raw.includes('Firefox/')
          ? 'Firefox'
          : raw.includes('Chrome/')
            ? 'Chrome'
            : raw.includes('Safari/')
              ? 'Safari'
              : raw.includes('Opera/') || raw.includes('OPR/')
                ? 'Opera'
                : raw.includes('Mobile Safari')
                  ? 'Safari'
                  : 'Navigateur';

    const platform =
      raw.includes('iPhone') || raw.includes('iPad')
        ? 'iPhone'
        : raw.includes('Android')
          ? 'Android'
          : raw.includes('Windows')
            ? 'Windows'
            : raw.includes('Mac OS X') || raw.includes('Macintosh')
              ? 'Mac'
              : raw.includes('Linux')
                ? 'Linux'
                : '';

    const parts = [browser, platform].filter(Boolean);
    if (parts.length > 0) {
      return parts.join(' sur ');
    }

    return raw.length > 70 ? `${raw.slice(0, 67)}...` : raw;
  }

  async resendEmailVerification(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        emailVerifiedAt: true,
      },
    });

    if (!user?.email) {
      throw new ForbiddenException('Email introuvable pour ce compte.');
    }

    if (user.emailVerifiedAt) {
      return { success: true, alreadyVerified: true };
    }

    await this.sendVerificationOtp(user.id, user.email, user.username);
    return { success: true };
  }

  async requestEmailVerification(email: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.prisma.user.findFirst({
      where: {
        email: { equals: normalizedEmail, mode: 'insensitive' },
      },
      select: {
        id: true,
        email: true,
        username: true,
        emailVerifiedAt: true,
      },
    });

    if (!user?.email) {
      return { success: true };
    }

    if (user.emailVerifiedAt) {
      return { success: true, alreadyVerified: true };
    }

    await this.sendVerificationOtp(user.id, user.email, user.username);
    return { success: true };
  }

  async verifyEmailOtp(email: string, code: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.prisma.user.findFirst({
      where: {
        email: { equals: normalizedEmail, mode: 'insensitive' },
      },
      select: {
        id: true,
      },
    });

    if (!user) {
      throw new ForbiddenException('Code invalide ou expire.');
    }

    const tokenHash = createHash('sha256')
      .update(code.trim())
      .digest('hex');
    const now = new Date();

    const record = await this.prisma.emailVerificationToken.findFirst({
      where: {
        userId: user.id,
        tokenHash,
        usedAt: null,
        expiresAt: {
          gt: now,
        },
      },
      select: {
        id: true,
      },
    });

    if (!record) {
      throw new ForbiddenException('Code invalide ou expire.');
    }

    await this.prisma.$transaction([
      this.prisma.emailVerificationToken.update({
        where: { id: record.id },
        data: { usedAt: now },
      }),
      this.prisma.user.update({
        where: { id: user.id },
        data: { emailVerifiedAt: now },
      }),
    ]);

    return { success: true };
  }

  async verifyEmailToken(token: string) {
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const now = new Date();

    const record = await this.prisma.emailVerificationToken.findFirst({
      where: {
        tokenHash,
        usedAt: null,
        expiresAt: {
          gt: now,
        },
      },
      select: {
        id: true,
        userId: true,
      },
    });

    if (!record) {
      throw new ForbiddenException('Token invalide ou expire.');
    }

    await this.prisma.$transaction([
      this.prisma.emailVerificationToken.update({
        where: { id: record.id },
        data: { usedAt: now },
      }),
      this.prisma.user.update({
        where: { id: record.userId },
        data: { emailVerifiedAt: now },
      }),
    ]);

    return { success: true };
  }

  async requestPasswordReset(email: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.prisma.user.findFirst({
      where: {
        email: { equals: normalizedEmail, mode: 'insensitive' },
      },
      select: {
        id: true,
        email: true,
        username: true,
        passwordHash: true,
      },
    });

    if (!user?.email || !user.passwordHash) {
      return { success: true };
    }

    const otpCode = this.generateOtpCode();
    const tokenHash = createHash('sha256').update(otpCode).digest('hex');
    const ttlMinutes = this.getPasswordResetOtpTtlMinutes();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + ttlMinutes);

    await this.prisma.passwordResetToken.deleteMany({
      where: {
        userId: user.id,
        usedAt: null,
      },
    });

    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    const subject = 'Réinitialise ton mot de passe HangOutHub';
    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a;">
        <h2 style="margin: 0 0 12px;">Mot de passe oublié</h2>
        <p>Salut ${user.username || 'la'},</p>
        <p>Voici ton code pour réinitialiser ton mot de passe :</p>
        <p style="margin: 16px 0; font-size: 22px; letter-spacing: 4px; font-weight: bold;">
          ${otpCode}
        </p>
        <p>Ce code expire dans ${ttlMinutes} minutes.</p>
      </div>
    `;

    await this.emailService.sendEmail({
      toEmail: user.email,
      toName: user.username,
      subject,
      html,
    });

    return { success: true };
  }

  async verifyPasswordResetOtp(email: string, code: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.prisma.user.findFirst({
      where: {
        email: { equals: normalizedEmail, mode: 'insensitive' },
      },
      select: {
        id: true,
      },
    });

    if (!user) {
      throw new ForbiddenException('Code invalide ou expire.');
    }

    const tokenHash = createHash('sha256')
      .update(code.trim())
      .digest('hex');
    const now = new Date();

    const record = await this.prisma.passwordResetToken.findFirst({
      where: {
        userId: user.id,
        tokenHash,
        usedAt: null,
        expiresAt: {
          gt: now,
        },
      },
      select: {
        id: true,
      },
    });

    if (!record) {
      throw new ForbiddenException('Code invalide ou expire.');
    }

    return { success: true };
  }

  async resetPasswordOtp(email: string, code: string, password: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.prisma.user.findFirst({
      where: {
        email: { equals: normalizedEmail, mode: 'insensitive' },
      },
      select: {
        id: true,
      },
    });

    if (!user) {
      throw new ForbiddenException('Code invalide ou expire.');
    }

    const tokenHash = createHash('sha256')
      .update(code.trim())
      .digest('hex');
    const now = new Date();

    const record = await this.prisma.passwordResetToken.findFirst({
      where: {
        userId: user.id,
        tokenHash,
        usedAt: null,
        expiresAt: {
          gt: now,
        },
      },
      select: {
        id: true,
      },
    });

    if (!record) {
      throw new ForbiddenException('Code invalide ou expire.');
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await this.prisma.$transaction([
      this.prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: now },
      }),
      this.prisma.user.update({
        where: { id: user.id },
        data: { passwordHash },
      }),
      this.prisma.session.deleteMany({
        where: { userId: user.id },
      }),
    ]);

    return { success: true };
  }

  private generateOtpCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private getOtpTtlMinutes() {
    return Number(process.env.EMAIL_VERIFICATION_OTP_TTL_MINUTES || 10);
  }

  private getPasswordResetOtpTtlMinutes() {
    return Number(process.env.PASSWORD_RESET_OTP_TTL_MINUTES || 10);
  }

  private async sendVerificationOtp(
    userId: string,
    email: string,
    username: string,
  ) {
    const otpCode = this.generateOtpCode();
    const tokenHash = createHash('sha256').update(otpCode).digest('hex');
    const ttlMinutes = this.getOtpTtlMinutes();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + ttlMinutes);

    await this.prisma.emailVerificationToken.deleteMany({
      where: {
        userId,
        usedAt: null,
      },
    });

    await this.prisma.emailVerificationToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
      },
    });

    const subject = 'Confirme ton email HangOutHub';
    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a;">
        <h2 style="margin: 0 0 12px;">Bienvenue sur HangOutHub</h2>
        <p>Salut ${username || 'la'},</p>
        <p>Voici ton code de verification :</p>
        <p style="margin: 16px 0; font-size: 22px; letter-spacing: 4px; font-weight: bold;">
          ${otpCode}
        </p>
        <p>Ce code expire dans ${ttlMinutes} minutes.</p>
      </div>
    `;

    await this.emailService.sendEmail({
      toEmail: email,
      toName: username,
      subject,
      html,
    });
  }
}
