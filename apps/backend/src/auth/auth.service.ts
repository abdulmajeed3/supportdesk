import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UserRole, UserStatus } from '@prisma/client';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const hashedPassword = await argon2.hash(dto.password);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: UserRole.CUSTOMER,
      },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, createdAt: true },
    });

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    return { user, ...tokens };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });

    if (!user) {
      // Use same error to prevent email enumeration
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException('Your account has been suspended. Please contact support.');
    }

    const passwordValid = await argon2.verify(user.password, dto.password);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    const { password: _, ...safeUser } = user;
    return { user: safeUser, ...tokens };
  }

  async refreshTokens(rawToken: string) {
    const tokenHash = this.hashToken(rawToken);
    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: { select: { id: true, email: true, role: true, status: true } } },
    });

    if (!storedToken || storedToken.isRevoked || storedToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (storedToken.user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException('Account is no longer active');
    }

    // Rotate: revoke old, issue new
    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { isRevoked: true },
    });

    return this.generateTokens(storedToken.user.id, storedToken.user.email, storedToken.user.role);
  }

  async logout(rawToken: string) {
    const tokenHash = this.hashToken(rawToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash },
      data: { isRevoked: true },
    });
  }

  async logoutAll(userId: string) {
    await this.prisma.refreshToken.updateMany({
      where: { userId },
      data: { isRevoked: true },
    });
  }

  private async generateTokens(userId: string, email: string, role: UserRole) {
    const payload = { sub: userId, email, role };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('app.jwt.accessSecret'),
      expiresIn: 900, // 15 minutes in seconds
    });

    const rawRefreshToken = crypto.randomBytes(48).toString('hex');
    const tokenHash = this.hashToken(rawRefreshToken);
    const expiresInDays = 7;
    const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);

    await this.prisma.refreshToken.create({
      data: { userId, tokenHash, expiresAt },
    });

    // Prune old revoked tokens for this user (keep DB tidy)
    await this.prisma.refreshToken.deleteMany({
      where: { userId, isRevoked: true, expiresAt: { lt: new Date() } },
    });

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      expiresIn: 15 * 60, // seconds
    };
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
