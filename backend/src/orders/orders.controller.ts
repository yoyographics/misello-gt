import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { UpdateTrackingDto } from './dto/update-tracking.dto';
import { OrderQueryDto } from './dto/order-query.dto';
import { JwtClientGuard } from '../auth/guards/jwt-client.guard';
import { JwtAdminGuard } from '../auth/guards/jwt-admin.guard';

@ApiTags('Pedidos')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  // ============================================================
  // CLIENTE
  // ============================================================

  @Post()
  @UseGuards(JwtClientGuard)
  @ApiBearerAuth()
  create(@Body() dto: CreateOrderDto, @Req() req: any) {
    return this.ordersService.create(req.user.sub, dto);
  }

  @Get('my')
  @UseGuards(JwtClientGuard)
  @ApiBearerAuth()
  findMyOrders(@Req() req: any) {
    return this.ordersService.findMyOrders(req.user.sub);
  }

  @Get('my/:id')
  @UseGuards(JwtClientGuard)
  @ApiBearerAuth()
  findMyOrderById(@Param('id') id: string, @Req() req: any) {
    return this.ordersService.findMyOrderById(req.user.sub, id);
  }

  @Patch('my/:id/cancel')
  @UseGuards(JwtClientGuard)
  @ApiBearerAuth()
  cancelMyOrder(@Param('id') id: string, @Req() req: any) {
    return this.ordersService.cancel(id, req.user.sub, false);
  }

  // ============================================================
  // ADMIN
  // ============================================================

  @Get('admin/all')
  @UseGuards(JwtAdminGuard)
  @ApiBearerAuth()
  findAllAdmin(@Query() query: OrderQueryDto) {
    return this.ordersService.findAllAdmin(query);
  }

  @Get('admin/:id')
  @UseGuards(JwtAdminGuard)
  @ApiBearerAuth()
  findOneAdmin(@Param('id') id: string) {
    return this.ordersService.findOneAdmin(id);
  }

  @Patch('admin/:id/status')
  @UseGuards(JwtAdminGuard)
  @ApiBearerAuth()
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
    @Req() req: any,
  ) {
    return this.ordersService.updateStatus(id, dto, req.user.sub);
  }

  @Patch('admin/:id/tracking')
  @UseGuards(JwtAdminGuard)
  @ApiBearerAuth()
  updateTracking(@Param('id') id: string, @Body() dto: UpdateTrackingDto) {
    return this.ordersService.updateTracking(id, dto);
  }

  @Patch('admin/:id/approve')
  @UseGuards(JwtAdminGuard)
  @ApiBearerAuth()
  approve(@Param('id') id: string, @Req() req: any) {
    return this.ordersService.approve(id, req.user.sub);
  }

  @Patch('admin/:id/cancel')
  @UseGuards(JwtAdminGuard)
  @ApiBearerAuth()
  cancelAdmin(@Param('id') id: string, @Req() req: any) {
    return this.ordersService.cancel(id, req.user.sub, true);
  }
}
