import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { ServicesModule } from './services/services.module';
import { AuthModule } from './modules/auth/auth.module';
import { ProfileModule } from './modules/profiles/profile.module';
import { PlansModule } from './modules/plans/plans.module';
import { InvitationsModule } from './modules/invitations/invitations.module';
import { ChatsModule } from './modules/chats/chats.module';

@Module({
  imports: [
    DatabaseModule,
    ServicesModule,
    AuthModule,
    ProfileModule,
    PlansModule,
    InvitationsModule,
    ChatsModule,
  ],
})
export class AppModule {}