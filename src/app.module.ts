import { Module } from '@nestjs/common';
import { HelloModule } from './hello/hello.module';
import { DatabaseModule } from './database/database.module';

@Module({
  imports: [DatabaseModule, HelloModule],
})
export class AppModule {}