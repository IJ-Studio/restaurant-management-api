import '@aikidosec/firewall';
import { NestFactory } from '@nestjs/core';
// import { ZenGuard } from './guards/zen.guard';
import * as express from 'express';
import { AppModule } from './app.module';
import { origenesCors } from './common/config/cors';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { createGlobalValidationPipe } from './common/config/validation.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalPipes(createGlobalValidationPipe());

  // app.useGlobalGuards(new ZenGuard());
  // CORS_ORIGINS (separados por comas); sin ella, los orígenes de siempre.
  app.enableCors({ origin: origenesCors() });
  app.use('/pagos/webhook', express.raw({ type: 'application/json' }));
  app.use(express.json());

  await app.listen(process.env.PORT ?? 10000, '0.0.0.0');
}
void bootstrap();
