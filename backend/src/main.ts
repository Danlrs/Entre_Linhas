import 'reflect-metadata';
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

  await app.listen(env.port);
  app.get(Logger).log(`Nest listening on port ${env.port} (prefix /${globalPrefix})`);
}

void bootstrap();
