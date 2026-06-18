import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Inject,
} from '@nestjs/common';
import type { LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import type { Request, Response } from 'express';

const HTTP_SERVER_ERROR_STATUS_MIN = 500;

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService,
  ) {}

  catch(exception: HttpException, host: ArgumentsHost) {
    const httpContext = host.switchToHttp();
    const response = httpContext.getResponse<Response>();
    const request = httpContext.getRequest<Request>();
    const status = exception.getStatus();
    const body = exception.getResponse();
    const message = typeof body === 'string' ? body : exception.message;

    if (status >= HTTP_SERVER_ERROR_STATUS_MIN) {
      this.logger.error(`${request.method} ${request.url} ${status} ${message}`);
    } else {
      this.logger.warn(`${request.method} ${request.url} ${status} ${message}`);
    }

    response.status(status).json(
      typeof body === 'string'
        ? { statusCode: status, message: body }
        : body,
    );
  }
}
