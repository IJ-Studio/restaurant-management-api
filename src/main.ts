import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ─── HABILITAR CORS ──────────────────────────────────────────────────
  // Esto permite que tu frontend (puerto 3000) se comunique con el 3001
  app.enableCors();
  // ────────────────────────────────────────────────────────────────────

  await app.listen(process.env.PORT ?? 3001);
  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();
