import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import type { NextFunction, Request, Response } from 'express';
import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

function resolvePreferredPort() {
  const value = Number(process.env.PORT ?? 3000);

  if (!Number.isFinite(value) || value <= 0) {
    return 3000;
  }

  return value;
}

function resolveCorsOptions(): CorsOptions {
  const defaultAllowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3001',
    'https://hang-out-hub-backoffice.vercel.app',
  ];

  const envOrigins = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

  const allowedOrigins =
    envOrigins.length > 0 ? envOrigins : defaultAllowedOrigins;

  const isLocalOrigin = (origin: string) =>
    /^https?:\/\/localhost(?::\d+)?$/i.test(origin) ||
    /^https?:\/\/127\.0\.0\.1(?::\d+)?$/i.test(origin);

  return {
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (
        allowedOrigins.includes('*') ||
        allowedOrigins.includes(origin) ||
        isLocalOrigin(origin)
      ) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin non autorisee par CORS: ${origin}`), false);
    },
  };
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
