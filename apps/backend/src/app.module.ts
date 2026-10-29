import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { TicketsModule } from './tickets/tickets.module';
import { TicketMessagesModule } from './ticket-messages/ticket-messages.module';
import { CategoriesModule } from './categories/categories.module';
import { AssignmentsModule } from './assignments/assignments.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { NotificationsModule } from './notifications/notifications.module';
import appConfig from './config/app.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
      envFilePath: ['.env'],
    }),
    ThrottlerModule.forRoot([
      {
        name: 'global',
        ttl: 60000,
        limit: 100,
      },
    ]),
    PrismaModule,
    AuthModule,
    UsersModule,
    TicketsModule,
    TicketMessagesModule,
    CategoriesModule,
    AssignmentsModule,
    DashboardModule,
    NotificationsModule,
  ],
})
export class AppModule {}
