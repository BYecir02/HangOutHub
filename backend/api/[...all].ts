import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module.js';
import { resolveCorsOptions } from '../src/cors-options.js';

type RequestHandler = (req: unknown, res: unknown) => unknown;
type ServerRequest = {
  method?: string;
  headers?: Record<string, string | string[] | undefined>;
};
type ServerResponse = {
  setHeader: (name: string, value: string) => void;
  statusCode: number;
  end: (chunk?: string) => void;
};

let cachedHandler: Promise<RequestHandler> | null = null;

async function getHandler(): Promise<RequestHandler> {
  if (!cachedHandler) {
    cachedHandler = (async () => {
      const app = await NestFactory.create(AppModule);
      app.setGlobalPrefix('api/v1');
      app.enableCors(resolveCorsOptions());
      app.useGlobalPipes(
        new ValidationPipe({
          whitelist: true,
          transform: true,
          transformOptions: {
            enableImplicitConversion: true,
          },
        }),
      );
      await app.init();

      return app.getHttpAdapter().getInstance() as RequestHandler;
    })();
  }

  return cachedHandler;
}

export const config = {
  api: {
    bodyParser: false,
    externalResolver: true,
  },
};

const allowedOrigins = new Set([
  'https://hang-out-hub-backoffice.vercel.app',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3001',
]);

function applyCorsHeaders(req: ServerRequest, res: ServerResponse) {
  const originHeader = req.headers?.origin;
  const origin = Array.isArray(originHeader) ? originHeader[0] : originHeader;
  const allowOrigin =
    origin && allowedOrigins.has(origin)
      ? origin
      : 'https://hang-out-hub-backoffice.vercel.app';

  res.setHeader('Access-Control-Allow-Origin', allowOrigin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  );
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, Origin, X-Requested-With, Accept',
  );
}

export default async function handler(req: unknown, res: unknown) {
  const serverReq = req as ServerRequest;
  const serverRes = res as ServerResponse;

  applyCorsHeaders(serverReq, serverRes);

  if (serverReq.method === 'OPTIONS') {
    serverRes.statusCode = 204;
    serverRes.end();
    return;
  }

  try {
    const nestHandler = await getHandler();
    return nestHandler(req, res);
  } catch (error) {
    console.error('Vercel handler bootstrap error', error);
    serverRes.statusCode = 500;
    serverRes.end(
      JSON.stringify({
        message: 'Internal server error while bootstrapping API',
      }),
    );
    return;
  }
}
