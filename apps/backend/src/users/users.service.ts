import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAgentDto } from './dto/create-agent.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { UserRole, UserStatus } from '@prisma/client';
import { PaginationDto, paginate } from '../common/dto/pagination.dto';
import * as argon2 from 'argon2';

const USER_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(pagination: PaginationDto, role?: UserRole) {
    const { page = 1, limit = 20 } = pagination;
    const skip = (page - 1) * limit;

    const where = role ? { role } : {};

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({ where, skip, take: limit, select: USER_SELECT, orderBy: { createdAt: 'desc' } }),
      this.prisma.user.count({ where }),
    ]);

    return paginate(users, total, page, limit);
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id }, select: USER_SELECT });
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { ...dto },
      select: USER_SELECT,
    });
  }

  async createAgent(dto: CreateAgentDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('An account with this email already exists');

    const hashedPassword = await argon2.hash(dto.password);
    return this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: UserRole.AGENT,
      },
      select: USER_SELECT,
    });
  }

  async updateStatus(id: string, dto: UpdateUserStatusDto, actingUser: { id: string; role: UserRole }) {
    const target = await this.prisma.user.findUnique({ where: { id } });
    if (!target) throw new NotFoundException(`User ${id} not found`);

    // Admins cannot deactivate themselves
    if (actingUser.id === id && dto.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException('You cannot deactivate your own account');
    }

    // Only admins can change admin status
    if (target.role === UserRole.ADMIN && actingUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only administrators can modify admin accounts');
    }

    return this.prisma.user.update({
      where: { id },
      data: { status: dto.status },
      select: USER_SELECT,
    });
  }

  async findAgents() {
    return this.prisma.user.findMany({
      where: { role: UserRole.AGENT, status: UserStatus.ACTIVE },
      select: USER_SELECT,
      orderBy: { firstName: 'asc' },
    });
  }
}
