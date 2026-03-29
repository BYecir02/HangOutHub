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

let cachedHandler: RequestHandler | null = null;

async function getHandler(): Promise<RequestHandler> {
  if (cachedHandler) {
    return cachedHandler;
  }

  const [{ NestFactory }, { AppModule }, { resolveCorsOptions }] =
    await Promise.all([
      import('@nestjs/core'),
      import('../src/app.module'),
      import('../src/cors-options'),
    ]);

  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');
  app.enableCors(resolveCorsOptions());
  await app.init();

  cachedHandler = app.getHttpAdapter().getInstance() as RequestHandler;
  return cachedHandler;
}

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
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
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
