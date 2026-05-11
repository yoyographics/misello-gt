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
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import {
  CreateDiscountDto,
  UpdateDiscountDto,
  UpdateSettingDto,
  CreateAdminUserDto,
  UpdateAdminUserDto,
  UpdateRolePermissionsDto,
} from './dto/admin.dto';
import { JwtAdminGuard } from '../auth/guards/jwt-admin.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { AdminRole } from '@prisma/client';

/**
 * Controlador del panel de administracion (private API).
 * Requiere JWT de administrador.
 */
@ApiTags('Panel de Administracion')
@Controller('admin')
@UseGuards(JwtAdminGuard, PermissionsGuard)
@ApiBearerAuth()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ── Dashboard ──
  @Get('dashboard')
  @Permissions('admin')
  getDashboard() {
    return this.adminService.getDashboardStats();
  }

  // ── Discounts ──
  @Get('discounts')
  @Permissions('discounts')
  findAllDiscounts() {
    return this.adminService.findAllDiscounts();
  }

  @Post('discounts')
  @Permissions('discounts')
  createDiscount(@Body() dto: CreateDiscountDto) {
    return this.adminService.createDiscount({
      ...dto,
      startsAt: new Date(dto.startsAt),
      endsAt: new Date(dto.endsAt),
    });
  }

  @Patch('discounts/:id')
  @Permissions('discounts')
  updateDiscount(@Param('id') id: string, @Body() dto: UpdateDiscountDto) {
    return this.adminService.updateDiscount(id, dto);
  }

  @Delete('discounts/:id')
  @Permissions('discounts')
  deleteDiscount(@Param('id') id: string) {
    return this.adminService.deleteDiscount(id);
  }

  // ── Waitlist ──
  @Get('waitlist')
  @Permissions('orders')
  findAllWaitlist() {
    return this.adminService.findAllWaitlist();
  }

  @Delete('waitlist/:id')
  @Permissions('orders')
  deleteWaitlistEntry(@Param('id') id: string) {
    return this.adminService.deleteWaitlistEntry(id);
  }

  // ── Settings ──
  @Get('settings/:key')
  @Permissions('admin')
  getSetting(@Param('key') key: string) {
    return this.adminService.getSetting(key);
  }

  @Post('settings')
  @Permissions('admin')
  setSetting(@Body() dto: UpdateSettingDto) {
    return this.adminService.setSetting(dto.key, dto.value);
  }

  @Get('settings/replica-price')
  @Permissions('admin')
  getReplicaPrice() {
    return this.adminService.getReplicaPrice();
  }

  @Post('settings/replica-price')
  @Permissions('admin')
  setReplicaPrice(@Body('price') price: number) {
    return this.adminService.setReplicaPrice(price);
  }

  @Get('settings/terms-and-conditions')
  @Permissions('admin')
  getTermsAndConditions() {
    return this.adminService.getTermsAndConditions();
  }

  @Post('settings/terms-and-conditions')
  @Permissions('admin')
  setTermsAndConditions(@Body('html') html: string) {
    return this.adminService.setTermsAndConditions(html);
  }

  // ── Users ──
  @Get('users')
  @Permissions('admin')
  findAllUsers() {
    return this.adminService.findAllUsers();
  }

  @Post('users')
  @Permissions('admin')
  createUser(@Body() dto: CreateAdminUserDto) {
    return this.adminService.createUser(dto);
  }

  @Patch('users/:id')
  @Permissions('admin')
  updateUser(@Param('id') id: string, @Body() dto: UpdateAdminUserDto) {
    return this.adminService.updateUser(id, dto);
  }

  @Delete('users/:id')
  @Permissions('admin')
  deleteUser(@Param('id') id: string) {
    return this.adminService.deleteUser(id);
  }

  // ── Role Permissions ──
  @Get('roles/permissions')
  @Permissions('admin')
  getAllRolePermissions() {
    return this.adminService.getAllRolePermissions();
  }

  @Get('roles/permissions/:role')
  @Permissions('admin')
  getRolePermissions(@Param('role') role: AdminRole) {
    return this.adminService.getRolePermissions(role);
  }

  @Post('roles/permissions')
  @Permissions('admin')
  setRolePermissions(@Body() dto: UpdateRolePermissionsDto) {
    return this.adminService.setRolePermissions(dto.role, dto.permissions);
  }
}
