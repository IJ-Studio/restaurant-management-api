import '@aikidosec/firewall';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
// import { ZenGuard } from './guards/zen.guard';
import * as express from 'express';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { createGlobalValidationPipe } from './common/config/validation.config';
import { BODY_LIMIT, configureHttp } from './common/config/http.config';
import { isSwaggerEnabled, setupSwagger } from './common/config/swagger.config';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
  });
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalPipes(createGlobalValidationPipe());
  configureHttp(app);

  if (isSwaggerEnabled()) {
    setupSwagger(app);
  }

  // app.useGlobalGuards(new ZenGuard());
  app.use('/pagos/webhook', express.raw({ type: 'application/json' }));
  app.use(express.json({ limit: BODY_LIMIT }));

  await app.listen(process.env.PORT ?? 10000, '0.0.0.0');
}
void bootstrap();
