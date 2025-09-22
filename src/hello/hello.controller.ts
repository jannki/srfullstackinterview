import { Controller, Get } from '@nestjs/common';
import { HelloService, HelloResponse } from './hello.service';

@Controller()
export class HelloController {
  constructor(private readonly helloService: HelloService) {}

  @Get('hello')
  async getHello(): Promise<HelloResponse> {
    return await this.helloService.getHello();
  }
}