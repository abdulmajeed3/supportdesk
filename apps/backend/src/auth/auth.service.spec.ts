import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { UserRole, UserStatus } from '@prisma/client';
import * as argon2 from 'argon2';

// Partial mock of PrismaService
const mockPrisma = {
  user: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
  refreshToken: {
    create: vi.fn(),
    deleteMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
};

const mockJwt = { sign: vi.fn().mockReturnValue('mock-token') };
const mockConfig = { get: vi.fn().mockImplementation((key: string) => {
  if (key === 'app.jwt.accessSecret') return 'test-secret';
  if (key === 'app.jwt.accessExpiresIn') return '15m';
  return undefined;
}) };

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockPrisma.refreshToken.create.mockResolvedValue({ id: 'token-1' });
    mockPrisma.refreshToken.deleteMany.mockResolvedValue({ count: 0 });

    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  describe('register', () => {
    it('throws ConflictException when email already exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'existing-user' });

      await expect(
        service.register({ email: 'test@test.com', password: 'Test@123!', firstName: 'Test', lastName: 'User' }),
      ).rejects.toThrow(ConflictException);
    });

    it('creates user and returns tokens when email is new', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 'new-user',
        email: 'new@test.com',
        firstName: 'New',
        lastName: 'User',
        role: UserRole.CUSTOMER,
        createdAt: new Date(),
      });

      const result = await service.register({
        email: 'new@test.com',
        password: 'Test@123!',
        firstName: 'New',
        lastName: 'User',
      });

      expect(result.accessToken).toBe('mock-token');
      expect(result.refreshToken).toBeTruthy();
      expect(result.user.email).toBe('new@test.com');
    });
  });

  describe('login', () => {
    it('throws UnauthorizedException when user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: 'nonexistent@test.com', password: 'any' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when password is incorrect', async () => {
      const hashed = await argon2.hash('correct-password');
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@test.com',
        password: hashed,
        status: UserStatus.ACTIVE,
        role: UserRole.CUSTOMER,
        firstName: 'Test',
        lastName: 'User',
      });

      await expect(
        service.login({ email: 'test@test.com', password: 'wrong-password' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('returns tokens on valid credentials', async () => {
      const hashed = await argon2.hash('Test@123!');
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@test.com',
        password: hashed,
        status: UserStatus.ACTIVE,
        role: UserRole.CUSTOMER,
        firstName: 'Test',
        lastName: 'User',
      });

      const result = await service.login({ email: 'test@test.com', password: 'Test@123!' });

      expect(result.accessToken).toBe('mock-token');
      expect(result.refreshToken).toBeTruthy();
    });
  });
});
