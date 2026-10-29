import { Module } from '@nestjs/common';
import { TicketMessagesService } from './ticket-messages.service';
import { TicketMessagesController } from './ticket-messages.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [TicketMessagesController],
  providers: [TicketMessagesService],
})
export class TicketMessagesModule {}
