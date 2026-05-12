import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { InventoryQueryDto } from './dto/inventory-query.dto';
import { JwtAdminGuard } from '../auth/guards/jwt-admin.guard';

@ApiTags('Inventario')
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('logs')
  @UseGuards(JwtAdminGuard)
  @ApiBearerAuth()
  findLogs(@Query() query: InventoryQueryDto) {
    return this.inventoryService.findLogs(query);
  }

  @Post('adjust')
  @UseGuards(JwtAdminGuard)
  @ApiBearerAuth()
  adjustStock(@Body() dto: AdjustStockDto, @Req() req: any) {
    return this.inventoryService.adjustStock(dto, req.user.sub);
  }

  @Get('low-stock')
  @UseGuards(JwtAdminGuard)
  @ApiBearerAuth()
  findLowStock() {
    return this.inventoryService.findLowStock();
  }

  @Get('summary')
  @UseGuards(JwtAdminGuard)
  @ApiBearerAuth()
  getSummary() {
    return this.inventoryService.getStockSummary();
  }

  @Get()
  @UseGuards(JwtAdminGuard)
  @ApiBearerAuth()
  async findAll() {
    const [products, inks] = await Promise.all([
      this.inventoryService['prisma'].product.findMany({
        where: { isActive: true },
        select: { id: true, sku: true, name: true, stock: true },
        orderBy: { name: 'asc' },
      }),
      this.inventoryService['prisma'].ink.findMany({
        where: { isActive: true },
        select: { id: true, color: true, stock: true },
        orderBy: { color: 'asc' },
      }),
    ]);
    return [
      ...products.map((p: any) => ({ id: p.id, sku: p.sku, productName: p.name, quantity: p.stock, minStock: 5 })),
      ...inks.map((i: any) => ({ id: i.id, sku: `INK-${i.id.slice(0,4)}`, productName: `Tinta ${i.color}`, quantity: i.stock, minStock: 10 })),
    ];
  }
}
