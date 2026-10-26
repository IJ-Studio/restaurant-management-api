import '@aikidosec/firewall';
import { NestFactory } from '@nestjs/core';
// import { ZenGuard } from './guards/zen.guard';
import * as express from 'express';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  app.useGlobalFilters(new AllExceptionsFilter());

  // app.useGlobalGuards(new ZenGuard());
  app.enableCors({
    origin: ['https://el-quijote.vercel.app', 'http://localhost:3000'],
  });
  app.use('/pagos/webhook', express.raw({ type: 'application/json' }));
  app.use(express.json());

  await app.listen(process.env.PORT ?? 10000, '0.0.0.0');
}
void bootstrap();
