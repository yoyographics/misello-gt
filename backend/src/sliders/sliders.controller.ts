import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { SlidersService } from './sliders.service';
import { JwtAdminGuard } from '../auth/guards/jwt-admin.guard';

@Controller('sliders')
export class SlidersController {
  constructor(private readonly slidersService: SlidersService) {}

  @Get()
  findAllPublic() {
    return this.slidersService.findAllPublic();
  }

  @Get('admin/all')
  @UseGuards(JwtAdminGuard)
  findAllAdmin() {
    return this.slidersService.findAllAdmin();
  }

  @Post('admin')
  @UseGuards(JwtAdminGuard)
  create(@Body() dto: any) {
    return this.slidersService.create(dto);
  }

  @Patch('admin/:id')
  @UseGuards(JwtAdminGuard)
  update(@Param('id') id: string, @Body() dto: any) {
    return this.slidersService.update(id, dto);
  }

  @Delete('admin/:id')
  @UseGuards(JwtAdminGuard)
  remove(@Param('id') id: string) {
    return this.slidersService.remove(id);
  }
}
