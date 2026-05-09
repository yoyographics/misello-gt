import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';
import { join } from 'path';

@Controller('admin')
export class AdminController {
  @Get()
  serveAdmin(@Res() res: Response) {
    res.sendFile(join(process.cwd(), 'public', 'admin', 'index.html'));
  }

  @Get('index.html')
  serveAdminHtml(@Res() res: Response) {
    res.sendFile(join(process.cwd(), 'public', 'admin', 'index.html'));
  }
}
