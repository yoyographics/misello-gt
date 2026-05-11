import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';
import { join } from 'path';

@Controller('client')
export class ClientController {
  constructor() {
    console.log('✅ ClientController instantiated');
  }

  @Get()
  serveClientRoot(@Res() res: Response) {
    console.log('📥 ClientController @Get() called');
    res.sendFile(join(process.cwd(), 'public', 'client', 'index.html'));
  }

  @Get('*')
  serveClientPath(@Res() res: Response) {
    console.log('📥 ClientController @Get(*) called');
    res.sendFile(join(process.cwd(), 'public', 'client', 'index.html'));
  }
}
