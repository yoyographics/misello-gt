import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * Filtro global de excepciones.
 * Sanitiza los mensajes de error para no filtrar información interna al cliente.
 * Los detalles completos se loguean internamente.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const requestId =
      (request.headers['x-request-id'] as string) ||
      `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    let status = 500;
    let message = 'Error interno del servidor';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      message =
        typeof res === 'string'
          ? res
          : (res as any).message || 'Error de solicitud';
    }

    // Loguear detalles completos internamente (nunca enviarlos al cliente)
    const errorDetails =
      exception instanceof Error ? exception.stack : String(exception);
    this.logger.error(
      `[${requestId}] ${request.method} ${request.url} | Status: ${status} | Details: ${errorDetails}`,
    );

    // En producción, ocultar mensajes de error internos (500) genéricos
    const isProduction = process.env.NODE_ENV === 'production';
    const clientMessage =
      isProduction && status === 500 ? 'Error interno del servidor' : message;

    response.status(status).json({
      statusCode: status,
      message: clientMessage,
      requestId,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
