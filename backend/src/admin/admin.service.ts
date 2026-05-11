import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { AdminRole } from '@prisma/client';

/**
 * Servicio del panel de administracion.
 * Gestiona discounts, waitlist, settings, users y permisos configurables.
 */
@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ============================================================
  // DISCOUNTS
  // ============================================================

  async findAllDiscounts() {
    return this.prisma.discount.findMany({
      include: { product: { select: { id: true, name: true, sku: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createDiscount(data: {
    name: string;
    type: 'PERCENTAGE' | 'FIXED';
    value: number;
    minQuantity: number;
    productId?: string;
    startsAt: Date;
    endsAt: Date;
  }) {
    return this.prisma.discount.create({ data });
  }

  async updateDiscount(id: string, data: Partial<{ name: string; type: 'PERCENTAGE' | 'FIXED'; value: number; isActive: boolean }>) {
    return this.prisma.discount.update({ where: { id }, data });
  }

  async deleteDiscount(id: string) {
    return this.prisma.discount.delete({ where: { id } });
  }

  // ============================================================
  // WAITLIST
  // ============================================================

  async findAllWaitlist() {
    return this.prisma.waitlistEntry.findMany({
      include: { product: { select: { id: true, name: true, sku: true, stock: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteWaitlistEntry(id: string) {
    return this.prisma.waitlistEntry.delete({ where: { id } });
  }

  // ============================================================
  // SETTINGS (Replica Price, T&C, etc.)
  // ============================================================

  async getSetting(key: string) {
    const setting = await this.prisma.siteSettings.findUnique({ where: { key } });
    return setting?.value || null;
  }

  async setSetting(key: string, value: string) {
    return this.prisma.siteSettings.upsert({
      where: { key },
      update: { value, updatedAt: new Date() },
      create: { key, value },
    });
  }

  async getReplicaPrice(): Promise<number> {
    const value = await this.getSetting('REPLICA_PRICE');
    return value ? parseFloat(value) : 0;
  }

  async setReplicaPrice(price: number) {
    return this.setSetting('REPLICA_PRICE', price.toString());
  }

  async getTermsAndConditions(): Promise<string> {
    return (await this.getSetting('TERMS_AND_CONDITIONS')) || '';
  }

  async setTermsAndConditions(html: string) {
    return this.setSetting('TERMS_AND_CONDITIONS', html);
  }

  // ============================================================
  // USERS
  // ============================================================

  async findAllUsers() {
    return this.prisma.adminUser.findMany({
      select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createUser(data: { name: string; email: string; password: string; role: AdminRole; isActive?: boolean }) {
    const existing = await this.prisma.adminUser.findUnique({ where: { email: data.email } });
    if (existing) {
      throw new ConflictException('Ya existe un usuario con ese email');
    }
    const passwordHash = await bcrypt.hash(data.password, 12);
    return this.prisma.adminUser.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash,
        role: data.role,
        isActive: data.isActive ?? true,
      },
      select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true },
    });
  }

  async updateUser(id: string, data: Partial<{ name: string; email: string; password: string; role: AdminRole; isActive: boolean }>) {
    const updateData: any = { ...data };
    if (data.password) {
      updateData.passwordHash = await bcrypt.hash(data.password, 12);
      delete updateData.password;
    }
    return this.prisma.adminUser.update({
      where: { id },
      data: updateData,
      select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true },
    });
  }

  async deleteUser(id: string) {
    return this.prisma.adminUser.delete({ where: { id } });
  }

  // ============================================================
  // ROLE PERMISSIONS (configurables)
  // ============================================================

  async getRolePermissions(role: AdminRole) {
    const config = await this.prisma.roleConfig.findUnique({ where: { role } });
    if (config) return config.permissions as Record<string, boolean>;

    // Defaults por rol (fallback)
    const defaults: Record<AdminRole, Record<string, boolean>> = {
      ADMIN: { orders: true, payments: true, inventory: true, design: true, notifications: true, admin: true, discounts: true, fonts: true },
      CONTABILIDAD: { orders: true, payments: true, inventory: false, design: false, notifications: false, admin: false, discounts: false, fonts: false },
      IT: { orders: true, payments: true, inventory: true, design: true, notifications: true, admin: true, discounts: true, fonts: true },
      RECEPCION: { orders: true, payments: false, inventory: false, design: false, notifications: true, admin: false, discounts: false, fonts: false },
      DISENO: { orders: true, payments: false, inventory: false, design: true, notifications: false, admin: false, discounts: false, fonts: true },
      PRODUCCION: { orders: true, payments: false, inventory: false, design: false, notifications: false, admin: false, discounts: false, fonts: false },
    };
    return defaults[role] || {};
  }

  async setRolePermissions(role: AdminRole, permissions: Record<string, boolean>) {
    return this.prisma.roleConfig.upsert({
      where: { role },
      update: { permissions, updatedAt: new Date() },
      create: { role, permissions },
    });
  }

  async getAllRolePermissions() {
    const configs = await this.prisma.roleConfig.findMany();
    const result: Record<string, Record<string, boolean>> = {};
    for (const config of configs) {
      result[config.role] = config.permissions as Record<string, boolean>;
    }
    // Completar con defaults para roles sin config
    const allRoles = Object.values(AdminRole);
    for (const role of allRoles) {
      if (!result[role]) {
        result[role] = await this.getRolePermissions(role);
      }
    }
    return result;
  }

  // ============================================================
  // DASHBOARD STATS
  // ============================================================

  async getDashboardStats() {
    const [
      totalOrders,
      pendingOrders,
      totalProducts,
      lowStockProducts,
      totalWaitlist,
      totalUsers,
    ] = await Promise.all([
      this.prisma.order.count(),
      this.prisma.order.count({ where: { status: { in: ['PENDING_PAYMENT', 'PAYMENT_RECEIVED', 'CONFIRMED', 'IN_PRODUCTION'] } } }),
      this.prisma.product.count({ where: { isActive: true } }),
      this.prisma.product.count({ where: { stock: { lte: 5 }, isActive: true } }),
      this.prisma.waitlistEntry.count(),
      this.prisma.adminUser.count(),
    ]);

    return {
      totalOrders,
      pendingOrders,
      totalProducts,
      lowStockProducts,
      totalWaitlist,
      totalUsers,
    };
  }
}
