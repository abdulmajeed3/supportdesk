import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

interface AuthenticatedUser {
  id: string;
  role: UserRole;
}

@ApiTags('dashboard')
@ApiBearerAuth('access-token')
@Controller({ path: 'dashboard', version: '1' })
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('customer')
  @Roles(UserRole.CUSTOMER)
  @ApiOperation({ summary: 'Customer dashboard metrics' })
  customerDashboard(@CurrentUser() user: AuthenticatedUser) {
    return this.dashboardService.getCustomerDashboard(user.id);
  }

  @Get('agent')
  @Roles(UserRole.AGENT)
  @ApiOperation({ summary: 'Agent dashboard metrics' })
  agentDashboard(@CurrentUser() user: AuthenticatedUser) {
    return this.dashboardService.getAgentDashboard(user.id);
  }

  @Get('admin')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Administrator dashboard metrics' })
  adminDashboard() {
    return this.dashboardService.getAdminDashboard();
  }
}
