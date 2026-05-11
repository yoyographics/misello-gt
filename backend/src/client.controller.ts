import { Controller, Get, All, Res, Req } from '@nestjs/common';
import type { Response, Request } from 'express';
import { join } from 'path';

@Controller('client')
export class ClientController {
  @Get()
  @Get('*')
  @All('*')
  serveClient(@Req() req: Request, @Res() res: Response) {
    res.sendFile(join(process.cwd(), 'public', 'client', 'index.html'));
  }
}
