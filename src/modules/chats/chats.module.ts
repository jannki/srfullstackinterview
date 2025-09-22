import { Module } from '@nestjs/common';
import { ChatsController } from './chats.controller';
import { ServicesModule } from '../../services/services.module';

@Module({
  imports: [ServicesModule],
  controllers: [ChatsController],
})
export class ChatsModule {}
