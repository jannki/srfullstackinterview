import { Module } from '@nestjs/common';
import { ProfileController } from './profile.controller';
import { ServicesModule } from '../../services/services.module';

@Module({
  imports: [ServicesModule],
  controllers: [ProfileController],
})
export class ProfileModule {}
