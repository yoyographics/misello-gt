import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import * as express from 'express';
import { join } from 'path';
import { AppModule } from './app.module';

/**
 * Punto de entrada principal de la aplicación NestJS.
 * Configura seguridad, validación, CORS, Swagger y el prefijo global de rutas.
 */
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // ── Seguridad: headers OWASP vía Helmet ──
  // CSP relajado para permitir CDNs del panel de admin (Tailwind, Alpine, FontAwesome)
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'", 'https:', 'data:'],
          scriptSrc: [
            "'self'",
            "'unsafe-inline'",
            "'unsafe-eval'",
            'https://cdn.tailwindcss.com',
            'https://cdn.jsdelivr.net',
            'https://cdnjs.cloudflare.com',
          ],
          styleSrc: [
            "'self'",
            "'unsafe-inline'",
            'https://cdn.tailwindcss.com',
            'https://cdnjs.cloudflare.com',
          ],
          fontSrc: ["'self'", 'https://cdnjs.cloudflare.com'],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'", 'https:'],
        },
      },
    }),
  );

  // ── CORS: solo permitir el origen del frontend ──
  const frontendUrl = configService.get<string>('FRONTEND_URL') || '*';
  app.enableCors({
    origin: frontendUrl,
    credentials: true,
  });

  // ── Validación global de DTOs ──
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,             // elimina propiedades no definidas en el DTO
      forbidNonWhitelisted: true,  // lanza error si hay propiedades extra
      transform: true,             // transforma tipos automáticamente
    }),
  );

  // ── Archivos estáticos (panel de admin) ──
  app.use(express.static(join(process.cwd(), 'public')));

  // ── Prefijo global para todas las rutas ──
  app.setGlobalPrefix('api/v1');

  // ── Swagger: documentación automática de la API (solo en desarrollo) ──
  const nodeEnv = configService.get<string>('NODE_ENV');
  if (nodeEnv === 'development') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('misello.gt API')
      .setDescription('API del backend de misello.gt — Powered by YOYO GRAPHICS')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);
  }

  // ── Puerto desde variables de entorno ──
  const port = configService.get<number>('PORT') || 3000;
  await app.listen(port);

  console.log(`🚀 Servidor corriendo en: http://localhost:${port}/api/v1`);
  if (nodeEnv === 'development') {
    console.log(`📚 Swagger UI: http://localhost:${port}/api/docs`);
  }
}

bootstrap();
