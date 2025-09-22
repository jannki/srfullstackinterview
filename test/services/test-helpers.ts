import { TestingModule, Test } from '@nestjs/testing';
import { initializeDatabase } from '../../src/database/init';
import { DATABASE_CONNECTION } from '../../src/database/database.module';
import { DatabaseType } from '../../src/database/database';
import { ServicesModule } from '../../src/services/services.module';

export async function createServicesTestingModule() {
  const moduleRef: TestingModule = await Test.createTestingModule({
    imports: [ServicesModule],
  })
    .overrideProvider(DATABASE_CONNECTION)
    .useFactory({
      factory: async (): Promise<DatabaseType> => {
        return initializeDatabase(':memory:');
      },
    })
    .compile();

  return moduleRef;
}
