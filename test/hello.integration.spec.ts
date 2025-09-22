import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { HelloService } from '../src/hello/hello.service';
import { createDatabase } from '../src/database/database';

describe('Hello Integration Tests', () => {
  let app: INestApplication;
  let helloService: HelloService;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    helloService = moduleFixture.get<HelloService>(HelloService);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('HelloService', () => {
    it('should return hello message with timestamp', async () => {
      const result = await helloService.getHello();
      
      expect(result).toHaveProperty('message', 'Hello, World!');
      expect(result).toHaveProperty('timestamp');
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should increase greetings count after calling getHello', async () => {
      const initialCount = await helloService.getGreetingsCount();
      await helloService.getHello();
      const newCount = await helloService.getGreetingsCount();
      
      expect(newCount).toBe(initialCount + 1);
    });
  });

  describe('HelloController', () => {
    it('GET /hello should return hello response', async () => {
      const response = await request(app.getHttpServer())
        .get('/hello')
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Hello, World!');
      expect(response.body).toHaveProperty('timestamp');
      
      // Verify timestamp is a valid date string
      const timestamp = new Date(response.body.timestamp);
      expect(timestamp).toBeInstanceOf(Date);
      expect(timestamp.getTime()).not.toBeNaN();
    });

    it('should store greeting in database when endpoint is called', async () => {
      const initialCount = await helloService.getGreetingsCount();
      
      await request(app.getHttpServer())
        .get('/hello')
        .expect(200);

      const newCount = await helloService.getGreetingsCount();
      expect(newCount).toBe(initialCount + 1);
    });
  });

  describe('Service and Controller Integration', () => {
    it('should maintain consistency between service and controller responses', async () => {
      // Call service directly
      const serviceResult = await helloService.getHello();
      
      // Call controller endpoint
      const controllerResponse = await request(app.getHttpServer())
        .get('/hello')
        .expect(200);

      // Both should have the same message
      expect(serviceResult.message).toBe(controllerResponse.body.message);
      
      // Both should create valid timestamps
      expect(serviceResult.timestamp).toBeInstanceOf(Date);
      expect(new Date(controllerResponse.body.timestamp)).toBeInstanceOf(Date);
    });
  });
});