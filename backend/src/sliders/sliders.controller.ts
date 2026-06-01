import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { SlidersService } from './sliders.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { JwtAdminGuard } from '../auth/guards/jwt-admin.guard';

@Controller('sliders')
export class SlidersController {
  constructor(
    private readonly slidersService: SlidersService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @Get()
  findAllPublic() {
    return this.slidersService.findAllPublic();
  }

  @Get('admin/all')
  @UseGuards(JwtAdminGuard)
  findAllAdmin() {
    return this.slidersService.findAllAdmin();
  }

  @Post('admin/upload')
  @UseGuards(JwtAdminGuard)
  @UseInterceptors(FileInterceptor('image', { storage: memoryStorage() }))
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file || !file.buffer) {
      return { error: 'No se recibio ninguna imagen' };
    }
    const url = await this.cloudinaryService.uploadImage(file.buffer, 'sliders');
    return { url };
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
