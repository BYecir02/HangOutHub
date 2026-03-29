import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';

import { AppModule } from '../src/app.module';
import { resolveCorsOptions } from '../src/cors-options';

type RequestHandler = (req: unknown, res: unknown) => unknown;

let cachedHandler: RequestHandler | null = null;

async function getHandler(): Promise<RequestHandler> {
  if (cachedHandler) {
    return cachedHandler;
  }

  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.enableCors(resolveCorsOptions());
  app.setGlobalPrefix('api/v1');
  await app.init();

  cachedHandler = app.getHttpAdapter().getInstance() as RequestHandler;
  return cachedHandler;
}

export default async function handler(req: unknown, res: unknown) {
  const nestHandler = await getHandler();
  return nestHandler(req, res);
}
