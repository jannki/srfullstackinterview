import { Module } from '@nestjs/common';
import { PlansController } from './plans.controller';
import { ServicesModule } from '../../services/services.module';

@Module({
  imports: [ServicesModule],
  controllers: [PlansController],
})
export class PlansModule {}
