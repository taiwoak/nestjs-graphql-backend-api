import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: true,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.get('/health', (req: any, res: any) => {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
    });
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Application is running on: http://localhost:${port}/graphql`);
  console.log(`WebSocket subscriptions: ws://localhost:${port}/graphql`);
  console.log(`Health check: http://localhost:${port}/health`);
  console.log(`${'='.repeat(60)}`);
}

bootstrap();