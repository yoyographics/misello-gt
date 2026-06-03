import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import * as express from 'express';
import { join } from 'path';

/**
 * Punto de entrada principal de la aplicación NestJS.
 * Configura seguridad, validación, CORS, Swagger y el prefijo global de rutas.
 */
async function bootstrap() {
  // bodyParser deshabilitado para configurar límite manualmente (uploads base64 grandes)
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  const configService = app.get(ConfigService);

  // ── Body parser con límite aumentado (10MB para uploads base64) ──
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));

  // ── Seguridad: headers OWASP vía Helmet ──
  // CSP relajado para permitir CDNs del panel de admin (Tailwind, Alpine, FontAwesome)
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'", 'https:', 'data:'],
          scriptSrc: [
            "'self'",
            'https://cdn.jsdelivr.net',
            'https://cdnjs.cloudflare.com',
          ],
          styleSrc: [
            "'self'",
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
  const frontendUrl = configService.get<string>('FRONTEND_URL');
  if (!frontendUrl) {
    throw new Error('FRONTEND_URL is required');
  }
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

  // Filtro global de excepciones para sanitizar errores
  app.useGlobalFilters(new AllExceptionsFilter());

  // ── Servir frontend estatico (Next.js exportado) ──
  app.use(express.static(join(process.cwd(), 'public')));

  // ── Servir archivos subidos (disenos, logos, fuentes, recibos) ──
  app.use('/uploads', express.static(join(process.cwd(), 'uploads')));

  // ── API prefix handled by RouterModule in AppModule ──

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

  const logger = new Logger('Bootstrap');
  logger.log(`🚀 Servidor corriendo en puerto ${port}`);
  if (nodeEnv === 'development') {
    logger.log(`📚 Swagger UI: http://localhost:${port}/api/docs`);
  }
}

bootstrap();
