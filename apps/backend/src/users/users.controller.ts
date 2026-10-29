import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
  ApiCreatedResponse,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateAgentDto } from './dto/create-agent.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { PaginationDto } from '../common/dto/pagination.dto';

interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  firstName: string;
  lastName: string;
}

@ApiTags('users')
@ApiBearerAuth('access-token')
@Controller({ path: 'users', version: '1' })
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'List all users (admin only)' })
  @ApiOkResponse({ description: 'Paginated user list' })
  findAll(@Query() pagination: PaginationDto, @Query('role') role?: UserRole) {
    return this.usersService.findAll(pagination, role);
  }

  @Get('agents')
  @Roles(UserRole.ADMIN, UserRole.AGENT)
  @ApiOperation({ summary: 'List active agents (for assignment dropdowns)' })
  findAgents() {
    return this.usersService.findAgents();
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  getMe(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.findOne(user.id);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current user profile' })
  updateMe(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(user.id, dto);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get user by ID (admin only)' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findOne(id);
  }

  @Post('agents')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a new agent account (admin only)' })
  @ApiCreatedResponse({ description: 'Agent created' })
  createAgent(@Body() dto: CreateAgentDto) {
    return this.usersService.createAgent(dto);
  }

  @Patch(':id/status')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Activate or suspend a user account (admin only)' })
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.usersService.updateStatus(id, dto, user);
  }
}
