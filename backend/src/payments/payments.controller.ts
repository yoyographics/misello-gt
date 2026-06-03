import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Req,
  Headers,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';
import { PaymentQueryDto } from './dto/payment-query.dto';
import { JwtClientGuard } from '../auth/guards/jwt-client.guard';
import { JwtAdminGuard } from '../auth/guards/jwt-admin.guard';

@ApiTags('Pagos')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  // ============================================================
  // CLIENTE
  // ============================================================

  @Post()
  @UseGuards(JwtClientGuard)
  @ApiBearerAuth()
  create(@Body() dto: CreatePaymentDto, @Req() req: any) {
    return this.paymentsService.create(req.user.sub, dto);
  }

  // ============================================================
  // ADMIN
  // ============================================================

  @Get('admin/all')
  @UseGuards(JwtAdminGuard)
  @ApiBearerAuth()
  findAllAdmin(@Query() query: PaymentQueryDto) {
    return this.paymentsService.findAllAdmin(query);
  }

  @Get('admin/:id')
  @UseGuards(JwtAdminGuard)
  @ApiBearerAuth()
  findOneAdmin(@Param('id') id: string) {
    return this.paymentsService.findOneAdmin(id);
  }

  @Patch('admin/:id/confirm')
  @UseGuards(JwtAdminGuard)
  @ApiBearerAuth()
  confirm(
    @Param('id') id: string,
    @Body() dto: ConfirmPaymentDto,
    @Req() req: any,
  ) {
    return this.paymentsService.confirm(id, dto, req.user.sub);
  }

  @Patch('admin/:id/reject')
  @UseGuards(JwtAdminGuard)
  @ApiBearerAuth()
  reject(@Param('id') id: string, @Req() req: any) {
    return this.paymentsService.reject(id, req.user.sub);
  }

  // ============================================================
  // WEBHOOK (público — protegido por firma en implementación real)
  // ============================================================

  @Post('webhook')
  handleWebhook(@Body() payload: any) {
    return this.paymentsService.handleWebhook(payload);
  }
}
