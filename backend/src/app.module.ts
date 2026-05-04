import { APP_FILTER } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { SentryGlobalFilter, SentryModule } from '@sentry/nestjs/setup';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ProductModule } from './products/products.module';
import { UserModule } from './users/user.module';
import { AuthModule } from './auth/auth.module';
import { CategoriasModule } from './categorias/categorias.module';
import { MateriaisModule } from './materiais/materiais.module';
import { EstampasModule } from './estampas/estampas.module';
import { UploadsModule } from './uploads/uploads.module';
import { getValidatedEnv } from './config/env.schema';
import { resolvePostgresHostForConnection } from './config/resolve-postgres-host';
import { jwtExpires } from './config/jwt-types';

@Module({
  imports: [
    SentryModule.forRoot(),
    LoggerModule.forRootAsync({
      useFactory: () => {
        const env = getValidatedEnv();
        return {
          pinoHttp: {
            level: env.logLevel,
            transport:
              env.nodeEnv === 'development'
                ? {
                    target: 'pino-pretty',
                    options: { singleLine: true, colorize: true },
                  }
                : undefined,
          },
        };
      },
    }),
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60_000,
        limit: 500,
      },
    ]),
    JwtModule.registerAsync({
      global: true,
      useFactory: () => {
        const env = getValidatedEnv();
        return {
          secret: env.jwt.accessSecret,
          signOptions: { expiresIn: jwtExpires(env.jwt.accessExpiresIn) },
        };
      },
    }),
    TypeOrmModule.forRootAsync({
      useFactory: async () => {
        const env = getValidatedEnv();
        const logicalHost = env.db.host;
        const host = await resolvePostgresHostForConnection(logicalHost);
        const ssl =
          env.dbSsl ?
            {
              rejectUnauthorized: env.dbSslRejectUnauthorized,
              ...(logicalHost !== host ? { servername: logicalHost } : {}),
            }
          : false;
        return {
          type: 'postgres' as const,
          host,
          port: env.db.port,
          username: env.db.user,
          password: env.db.password,
          database: env.db.name,
          autoLoadEntities: true,
          synchronize: false,
          ssl,
          logging: env.nodeEnv === 'development' ? (['error', 'warn'] as const) : (['error'] as const),
          extra: {
            connectionTimeoutMillis: 15_000,
          },
        };
      },
    }),
    ProductModule,
    UserModule,
    AuthModule,
    CategoriasModule,
    MateriaisModule,
    EstampasModule,
    UploadsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_FILTER,
      useClass: SentryGlobalFilter,
    },
  ],
})
export class AppModule {}
