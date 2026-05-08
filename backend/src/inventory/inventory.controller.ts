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
}
