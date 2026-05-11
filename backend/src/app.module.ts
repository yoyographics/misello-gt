import { Module } from '@nestjs/common';
import { RouterModule } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { ApiModule } from './api.module';
import { AppController } from './app.controller';
import { AdminController } from './admin.controller';
import { ClientController } from './client.controller';
import { DebugController } from './debug.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    ApiModule,
    RouterModule.register([
      {
        path: 'api/v1',
        module: ApiModule,
      },
    ]),
  ],
  controllers: [AppController, AdminController, ClientController, DebugController],
  providers: [AppService],
})
export class AppModule {}
