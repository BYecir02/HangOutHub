import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import type { NextFunction, Request, Response } from 'express';
import { resolveCorsOptions } from './cors-options';

function resolvePreferredPort() {
  const value = Number(process.env.PORT ?? 3000);

  if (!Number.isFinite(value) || value <= 0) {
    return 3000;
  }

  return value;
}

async function listenWithPortFallback(
  app: NestExpressApplication,
  initialPort: number,
) {
  const maxRetries = 10;
  let currentPort = initialPort;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      await app.listen(currentPort);
      return currentPort;
    } catch (error) {
      const maybeError = error as NodeJS.ErrnoException;
      const isPortInUse = maybeError?.code === 'EADDRINUSE';

      if (!isPortInUse || attempt === maxRetries) {
        throw error;
      }

      currentPort += 1;
    }
  }

  return initialPort;
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.enableCors(resolveCorsOptions());

  // Note : Les fichiers statiques (uploads) sont gérés par ServeStaticModule dans app.module.ts

  //PRÉFIXE API (Tout passera par /api/v1/...)
  app.setGlobalPrefix('api/v1');

  // Middleware de logging simple pour voir les requêtes entrantes
  app.use((req: Request, _res: Response, next: NextFunction) => {
    console.log(`📞 Reçu : ${req.method} ${req.originalUrl}`);
    next();
  });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));

  const requestedPort = resolvePreferredPort();
  const activePort = await listenWithPortFallback(app, requestedPort);

  if (activePort !== requestedPort) {
    console.warn(
      `Port ${requestedPort} deja utilise, demarrage automatique sur ${activePort}.`,
    );
  }

  console.log(
    `🚀 Le serveur tourne sur : http://localhost:${activePort}/api/v1`,
  );
  console.log(`📂 Routes disponibles (exemple) :`);
  console.log(`   - GET http://localhost:${activePort}/api/v1/categories`);
}
void bootstrap();
