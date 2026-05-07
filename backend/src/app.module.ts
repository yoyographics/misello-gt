import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    // ConfigModule carga las variables de entorno y las hace disponibles vía ConfigService
    ConfigModule.forRoot({
      isGlobal: true, // disponible en toda la aplicación sin importar en cada módulo
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
