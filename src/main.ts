import '@aikidosec/firewall';
import { NestFactory } from '@nestjs/core';
import * as express from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  try {
    const app = await NestFactory.create(AppModule, { bodyParser: false });

    app.enableCors({
      origin: ['https://el-quijote.vercel.app', 'http://localhost:3000'],
    });
    app.use('/pagos/webhook', express.raw({ type: 'application/json' }));
    app.use(express.json());

    await app.listen(process.env.PORT ?? 10000, '0.0.0.0');
    console.log('Aplicación iniciada correctamente');
  } catch (error) {
    console.error('Error durante el bootstrap:', error);
    process.exit(1);
  }
}

bootstrap();
