import 'reflect-metadata';
import './dns-ipv4-first';
import './instrument';

import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import { mkdirSync } from 'fs';
import { join } from 'path';

/**
 * `AppModule` só depois de validar env, para decorators (Multer limits) não rodarem antes do Zod.
 */
async function bootstrap(): Promise<void> {
  const { getValidatedEnv } = await import('./config/env.schema');
  const env = getValidatedEnv();

  // Logs síncronos no stdout — Render captura mesmo se o restante falhar antes do Pino subir.
  console.log(
    `[bootstrap] NODE_ENV=${env.nodeEnv} PORT=${env.port} DB_HOST=${env.db.host} ssl=${env.dbSsl}`,
  );

  const { AppModule } = await import('./app.module');

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });
  app.useLogger(app.get(Logger));

  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);

  /** Sem Supabase: servir `./uploads` local (dev). Em produção com Storage, URLs vêm do Supabase. */
  if (!env.supabase) {
    const uploadsRoot = join(process.cwd(), 'uploads');
    for (const folder of ['products', 'estampas', 'materiais']) {
      mkdirSync(join(uploadsRoot, folder), { recursive: true });
    }
    app.useStaticAssets(uploadsRoot, { prefix: '/uploads/' });
  }

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const origins = env.cors.origins;
  app.enableCors({
    origin: origins.length === 1 ? origins[0] : origins,
    credentials: true,
  });

  // Render: o processo precisa escutar em 0.0.0.0 e usar a porta da env PORT.
  await app.listen(env.port, '0.0.0.0');
  app.get(Logger).log(`Nest listening on 0.0.0.0:${env.port} (prefix /${globalPrefix})`);
}

void bootstrap().catch((err: unknown) => {
  console.error('[bootstrap] fatal:', err);
  process.exit(1);
});
