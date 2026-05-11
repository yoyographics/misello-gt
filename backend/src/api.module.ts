import { Module } from '@nestjs/common';
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
  ],
})
export class ApiModule {}
