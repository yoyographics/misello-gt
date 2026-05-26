import { Controller, Get, Patch, Param, Query, UseGuards, Body } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CustomersService } from './customers.service';
import { JwtAdminGuard } from '../auth/guards/jwt-admin.guard';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@ApiTags('Clientes')
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get('admin/all')
  @UseGuards(JwtAdminGuard)
  @ApiBearerAuth()
  async findAll(
    @Query('search') search?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.customersService.findAll({
      search,
      skip: skip ? parseInt(skip) : 0,
      take: take ? parseInt(take) : 20,
    });
  }

  @Get('admin/:id')
  @UseGuards(JwtAdminGuard)
  @ApiBearerAuth()
  async findById(@Param('id') id: string) {
    return this.customersService.findById(id);
  }

  @Get('admin/:id/orders')
  @UseGuards(JwtAdminGuard)
  @ApiBearerAuth()
  async findOrders(@Param('id') id: string) {
    return this.customersService.findOrdersByCustomer(id);
  }

  @Patch('admin/:id')
  @UseGuards(JwtAdminGuard)
  @ApiBearerAuth()
  async update(@Param('id') id: string, @Body() dto: UpdateCustomerDto) {
    return this.customersService.update(id, dto);
  }
}
