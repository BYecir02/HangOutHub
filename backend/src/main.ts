import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.enableCors();
  
  // Note : Les fichiers statiques (uploads) sont gérés par ServeStaticModule dans app.module.ts

  //PRÉFIXE API (Tout passera par /api/v1/...)
  app.setGlobalPrefix('api/v1');

  // Middleware de logging simple pour voir les requêtes entrantes
  app.use((req: { method: string; originalUrl: string }, res: any, next: () => void) => {
    console.log(`📞 Reçu : ${req.method} ${req.originalUrl}`);
    next();
  });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`🚀 Le serveur tourne sur : http://localhost:${port}/api/v1`);
  console.log(`📂 Routes disponibles (exemple) :`);
  console.log(`   - GET http://localhost:${port}/api/v1/categories`);
}
void bootstrap();