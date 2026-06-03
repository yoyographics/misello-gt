import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';
import { join } from 'path';

@Controller('client')
export class ClientController {
  @Get()
  serveClientRoot(@Res() res: Response) {
    res.sendFile(join(process.cwd(), 'public', 'client', 'index.html'));
  }

  @Get('*')
  serveClientPath(@Res() res: Response) {
    res.sendFile(join(process.cwd(), 'public', 'client', 'index.html'));
  }
}
