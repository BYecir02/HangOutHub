import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

export function resolveCorsOptions(): CorsOptions {
  const defaultAllowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3001',
    'https://hang-out-hub-backoffice.vercel.app',
  ];

  const envOrigins = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

  const allowedOrigins = Array.from(
    new Set([...defaultAllowedOrigins, ...envOrigins]),
  );

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
