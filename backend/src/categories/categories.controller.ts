import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { JwtAdminGuard } from '../auth/guards/jwt-admin.guard';

@ApiTags('Categorías')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  /** Listado público de categorías */
  @Get()
  @ApiQuery({ name: 'showInWizard', required: false, type: Boolean })
  @ApiQuery({ name: 'showInStore', required: false, type: Boolean })
  findAll(
    @Query('showInWizard') showInWizard?: string,
    @Query('showInStore') showInStore?: string,
  ) {
    const filter: any = {};
    if (showInWizard !== undefined) filter.showInWizard = showInWizard === 'true';
    if (showInStore !== undefined) filter.showInStore = showInStore === 'true';
    return this.categoriesService.findAll(filter);
  }

  /** Detalle público de una categoría por slug */
  @Get(':slug')
  findBySlug(@Param('slug') slug: string) {
    return this.categoriesService.findBySlug(slug);
  }

  /** Crear categoría (admin) */
  @Post('admin')
  @UseGuards(JwtAdminGuard)
  @ApiBearerAuth()
  create(@Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(dto);
  }

  /** Actualizar categoría (admin) */
  @Patch('admin/:id')
  @UseGuards(JwtAdminGuard)
  @ApiBearerAuth()
  update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.categoriesService.update(id, dto);
  }

  /** Toggle visibilidad en tienda (admin) */
  @Patch('admin/:id/show-in-store')
  @UseGuards(JwtAdminGuard)
  @ApiBearerAuth()
  toggleShowInStore(@Param('id') id: string) {
    return this.categoriesService.toggleShowInStore(id);
  }

  /** Eliminar categoría — soft delete (admin) */
  @Delete('admin/:id')
  @UseGuards(JwtAdminGuard)
  @ApiBearerAuth()
  remove(@Param('id') id: string) {
    return this.categoriesService.remove(id);
  }
}
