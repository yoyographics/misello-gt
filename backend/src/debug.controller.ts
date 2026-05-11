import { Controller, Get } from '@nestjs/common';

@Controller('debug')
export class DebugController {
  @Get('routes')
  listRoutes() {
    // This will be populated by a middleware in main.ts
    return { message: 'See server logs for routes' };
  }

  @Get('client-test')
  clientTest() {
    return { message: 'Client test endpoint works!', timestamp: new Date().toISOString() };
  }
}
