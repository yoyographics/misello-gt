import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { InksService } from './inks.service';
import { CreateInkDto } from './dto/create-ink.dto';
import { UpdateInkDto } from './dto/update-ink.dto';
import { JwtAdminGuard } from '../auth/guards/jwt-admin.guard';

@ApiTags('Catálogo — Tintas')
@Controller('inks')
export class InksController {
  constructor(private readonly inksService: InksService) {}

  @Get()
  findAllPublic() {
    return this.inksService.findAllPublic();
  }

  @Get(':id')
  findOnePublic(@Param('id') id: string) {
    return this.inksService.findOnePublic(id);
  }

  @Get('admin/all')
  @UseGuards(JwtAdminGuard)
  @ApiBearerAuth()
  findAllAdmin() {
    return this.inksService.findAllAdmin();
  }

  @Post('admin')
  @UseGuards(JwtAdminGuard)
  @ApiBearerAuth()
  create(@Body() dto: CreateInkDto) {
    return this.inksService.create(dto);
  }

  @Patch('admin/:id')
  @UseGuards(JwtAdminGuard)
  @ApiBearerAuth()
  update(@Param('id') id: string, @Body() dto: UpdateInkDto) {
    return this.inksService.update(id, dto);
  }

  @Delete('admin/:id')
  @UseGuards(JwtAdminGuard)
  @ApiBearerAuth()
  remove(@Param('id') id: string) {
    return this.inksService.remove(id);
  }
}
