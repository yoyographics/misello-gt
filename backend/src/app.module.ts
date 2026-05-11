import { Module } from '@nestjs/common';
import { RouterModule } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MailerModule } from '@nestjs-modules/mailer';
import { PrismaModule } from './prisma/prisma.module';
import { ApiModule } from './api.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        transport: {
          host: config.get('MAIL_HOST'),
          port: config.get<number>('MAIL_PORT') || 587,
          secure: false,
          auth: {
            user: config.get('MAIL_USER'),
            pass: config.get('MAIL_PASSWORD'),
          },
        },
        defaults: {
          from: config.get('MAIL_FROM') || 'noreply@misello.gt',
        },
      }),
      inject: [ConfigService],
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
})
export class AppModule {}
