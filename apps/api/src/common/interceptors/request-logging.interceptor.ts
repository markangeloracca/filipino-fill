import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import type { Request, Response } from 'express';
import { tap, type Observable } from 'rxjs';

/** Logs method, path (no query string — it may contain search terms), status and latency. */
@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const started = performance.now();

    return next.handle().pipe(
      tap({
        next: () => this.log(req, http.getResponse<Response>().statusCode, started),
        error: () => this.log(req, 'ERR', started),
      }),
    );
  }

  private log(req: Request, status: number | string, started: number): void {
    this.logger.log(`${req.method} ${req.path} ${status} ${(performance.now() - started).toFixed(1)}ms`);
  }
}
