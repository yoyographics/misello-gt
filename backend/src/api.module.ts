import { Module } from '@nestjs/common';
import { RouterModule } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { ProductsModule } from './products/products.module';
import { InksModule } from './inks/inks.module';
import { FontsModule } from './fonts/fonts.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentsModule } from './payments/payments.module';
import { InventoryModule } from './inventory/inventory.module';

@Module({
  imports: [
    AuthModule,
    ProductsModule,
    InksModule,
    FontsModule,
    OrdersModule,
    PaymentsModule,
    InventoryModule,
    RouterModule.register([
      { path: 'api/v1', module: AuthModule },
      { path: 'api/v1', module: ProductsModule },
      { path: 'api/v1', module: InksModule },
      { path: 'api/v1', module: FontsModule },
      { path: 'api/v1', module: OrdersModule },
      { path: 'api/v1', module: PaymentsModule },
      { path: 'api/v1', module: InventoryModule },
    ]),
  ],
})
export class ApiModule {}
