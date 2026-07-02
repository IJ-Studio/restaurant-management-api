import '@aikidosec/firewall';
import { NestFactory } from '@nestjs/core';
// import { ZenGuard } from './guards/zen.guard';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // app.useGlobalGuards(new ZenGuard());
  app.enableCors({
    origin: ['https://el-quijote.vercel.app', 'http://localhost:3000'],
  });
  await app.listen(process.env.PORT ?? 10000, '0.0.0.0');
}
bootstrap();
