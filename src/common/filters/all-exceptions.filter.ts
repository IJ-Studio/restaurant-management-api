import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';

import { getPgErrorCode } from '../database/pg-errors';

export type ErrorResponse = {
  statusCode: number;
  code: string;
  message: string;
  details?: string[];
  requestId: string;
  error: string;
};

const CODE_BY_STATUS: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: 'VALIDATION_ERROR',
  [HttpStatus.UNAUTHORIZED]: 'UNAUTHORIZED',
  [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
  [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
  [HttpStatus.CONFLICT]: 'CONFLICT',
  [HttpStatus.UNPROCESSABLE_ENTITY]: 'UNPROCESSABLE_ENTITY',
  [HttpStatus.TOO_MANY_REQUESTS]: 'RATE_LIMITED',
  [HttpStatus.INTERNAL_SERVER_ERROR]: 'INTERNAL_ERROR',
};

type NormalizedError = {
  status: number;
  code: string;
  message: string;
  details?: string[];
};

/**
 * Contrato único de error: `{ statusCode, code, message, details?, requestId, error }`.
 * Nunca expone trazas ni mensajes internos de Postgres; esos solo van al log.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();

    const header = request.headers['x-request-id'];
    const requestId =
      (Array.isArray(header) ? header[0] : header) ?? randomUUID();

    const normalized = this.normalize(exception);

    if (normalized.status >= 500) {
      this.logger.error(
        `[${requestId}] ${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    if (normalized.status === 429) {
      // El ThrottlerGuard global usa ventanas de 60 s.
      response.setHeader('Retry-After', '60');
    }
    response.setHeader('X-Request-Id', requestId);

    const body: ErrorResponse = {
      statusCode: normalized.status,
      code: normalized.code,
      message: normalized.message,
      ...(normalized.details ? { details: normalized.details } : {}),
      requestId,
      error: HttpStatus[normalized.status] ?? 'ERROR',
    };

    response.status(normalized.status).json(body);
  }

  private normalize(exception: unknown): NormalizedError {
    const pgCode = getPgErrorCode(exception);

    if (pgCode === '23505') {
      return {
        status: HttpStatus.CONFLICT,
        code: 'CONFLICT',
        message: 'El recurso ya existe.',
      };
    }

    if (pgCode === '23503') {
      return {
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        code: 'FOREIGN_KEY_VIOLATION',
        message: 'El recurso referenciado no existe.',
      };
    }

    if (pgCode === '23514') {
      return {
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        code: 'CHECK_VIOLATION',
        message: 'Los datos no cumplen una regla de negocio.',
      };
    }

    if (exception instanceof HttpException) {
      return this.normalizeHttpException(exception);
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      code: 'INTERNAL_ERROR',
      message: 'Error interno del servidor.',
    };
  }

  private normalizeHttpException(exception: HttpException): NormalizedError {
    const status = exception.getStatus();
    const response = exception.getResponse();
    let message = exception.message;
    let details: string[] | undefined;

    if (typeof response === 'string') {
      message = response;
    } else if (typeof response === 'object' && response !== null) {
      const rawMessage = (response as { message?: unknown }).message;

      if (Array.isArray(rawMessage)) {
        details = rawMessage.map((item) => String(item));
        message = 'Datos inválidos.';
      } else if (typeof rawMessage === 'string') {
        message = rawMessage;
      }
    }

    return {
      status,
      code: CODE_BY_STATUS[status] ?? 'HTTP_ERROR',
      message,
      ...(details ? { details } : {}),
    };
  }
}
