import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { json, urlencoded, type Request, type Response, type NextFunction } from 'express';
import { AppModule } from './app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { Logger, ValidationPipe } from '@nestjs/common';
import { GlobalExceptionFilter } from './filters/global-exception.filter';

const HTTP_BODY_LIMIT = '5mb';

const logger = new Logger('Bootstrap');
const httpLogger = new Logger('HTTP');

function requestLoggingMiddleware(req: Request, res: Response, next: NextFunction): void {
  const startedAt = Date.now();
  res.on('finish', () => {
    const durationMs = Date.now() - startedAt;
    httpLogger.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${durationMs}ms`);
  });
  next();
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
  });
  app.use(json({ limit: HTTP_BODY_LIMIT }));
  app.use(urlencoded({ extended: true, limit: HTTP_BODY_LIMIT }));
  app.use(requestLoggingMiddleware);
  app.useGlobalFilters(new GlobalExceptionFilter());

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: false,
    })
  );

  if (process.env.NATS_URLS) {
    try {
      const microservice = app.connectMicroservice<MicroserviceOptions>({
        transport: Transport.NATS,
        options: {
          servers: process.env.NATS_URLS.split(',').filter((server) => server.trim().length > 0),
          queue: 'islamic-academy',
          debug: true,
        },
      });

      // CRITICAL: Apply interceptor BEFORE startAllMicroservices()
      const { ErrorHandlerInterceptor } = await import('./utils/interceptors/errorHandler.interceptor');
      microservice.useGlobalInterceptors(new ErrorHandlerInterceptor());

      await app.startAllMicroservices();
      logger.log('Microservices started successfully');
    } catch (error) {
      logger.error('Failed to start microservices', error);
    }
  } else {
    logger.warn('NATS_URLS not configured, skipping microservices setup');
  }

  await app.listen(process.env.PORT ?? 3000);
  logger.log(`Application is running on: ${await app.getUrl()}`);
}

void bootstrap();
