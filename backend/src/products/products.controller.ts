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
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { JwtAdminGuard } from '../auth/guards/jwt-admin.guard';

@ApiTags('Catálogo — Productos')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  /** Listado público de productos activos */
  @Get()
  findAllPublic(@Query() query: ProductQueryDto) {
    return this.productsService.findAllPublic(query);
  }

  /** Detalle público de un producto activo */
  @Get(':id')
  findOnePublic(@Param('id') id: string) {
    return this.productsService.findOnePublic(id);
  }

  /** Listado completo para admin (incluye inactivos) */
  @Get('admin/all')
  @UseGuards(JwtAdminGuard)
  @ApiBearerAuth()
  findAllAdmin(@Query() query: ProductQueryDto) {
    return this.productsService.findAllAdmin(query);
  }

  /** Crear producto (admin) */
  @Post('admin')
  @UseGuards(JwtAdminGuard)
  @ApiBearerAuth()
  create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  /** Actualizar producto (admin) */
  @Patch('admin/:id')
  @UseGuards(JwtAdminGuard)
  @ApiBearerAuth()
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.update(id, dto);
  }

  /** Eliminar producto — soft delete (admin) */
  @Delete('admin/:id')
  @UseGuards(JwtAdminGuard)
  @ApiBearerAuth()
  remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }
}
