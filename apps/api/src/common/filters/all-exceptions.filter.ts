import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { Request, Response } from 'express';
import { DomainException } from '../errors/domain.exceptions.js';

export interface ErrorEnvelope {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  statusCode: number;
  path: string;
  timestamp: string;
}

const HTTP_CODES: Record<number, string> = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHENTICATED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  405: 'METHOD_NOT_ALLOWED',
  409: 'CONFLICT',
  422: 'UNPROCESSABLE_ENTITY',
  429: 'RATE_LIMITED',
};

// Postgres error codes we can map to meaningful client errors.
const PG_UNIQUE_VIOLATION = '23505';
const PG_CHECK_VIOLATION = '23514';
const PG_FK_VIOLATION = '23503';

function isPgError(e: unknown): e is { code: string; constraint?: string } {
  return typeof e === 'object' && e !== null && 'code' in e && typeof (e as { code: unknown }).code === 'string' && /^[0-9A-Z]{5}$/.test((e as { code: string }).code);
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    const { status, code, message, details } = this.resolve(exception);

    if (status >= 500) {
      this.logger.error(`${req.method} ${req.path} -> ${status}`, exception instanceof Error ? exception.stack : String(exception));
    }

    const body: ErrorEnvelope = {
      error: { code, message, ...(details !== undefined ? { details } : {}) },
      statusCode: status,
      path: req.path,
      timestamp: new Date().toISOString(),
    };
    res.status(status).json(body);
  }

  private resolve(exception: unknown): { status: number; code: string; message: string; details?: unknown } {
    if (exception instanceof DomainException) {
      return { status: exception.status, code: exception.code, message: exception.message, details: exception.details };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();
      // ValidationPipe puts an array of messages under `message`.
      if (typeof response === 'object' && response !== null && Array.isArray((response as { message?: unknown }).message)) {
        return { status, code: 'VALIDATION_FAILED', message: 'Request validation failed', details: (response as { message: string[] }).message };
      }
      return { status, code: HTTP_CODES[status] ?? 'HTTP_ERROR', message: exception.message };
    }

    if (isPgError(exception)) {
      if (exception.code === PG_UNIQUE_VIOLATION) {
        return { status: HttpStatus.CONFLICT, code: 'CONFLICT', message: 'A record with these values already exists', details: { constraint: exception.constraint } };
      }
      if (exception.code === PG_CHECK_VIOLATION || exception.code === PG_FK_VIOLATION) {
        return { status: HttpStatus.UNPROCESSABLE_ENTITY, code: 'CONSTRAINT_VIOLATION', message: 'The data violates a database constraint', details: { constraint: exception.constraint } };
      }
    }

    return { status: HttpStatus.INTERNAL_SERVER_ERROR, code: 'INTERNAL_ERROR', message: 'Something went wrong on our end' };
  }
}
