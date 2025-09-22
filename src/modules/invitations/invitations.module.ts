import { Module } from '@nestjs/common';
import { InvitationsController } from './invitations.controller';
import { ServicesModule } from '../../services/services.module';

@Module({
  imports: [ServicesModule],
  controllers: [InvitationsController],
})
export class InvitationsModule {}
