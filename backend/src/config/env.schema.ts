import { createHmac } from 'crypto';
import { z } from 'zod';

function derivedRefreshSecret(accessSecret: string): string {
  return createHmac('sha256', accessSecret).update('entrelinhas:refresh-v1').digest('hex');
}

/** `VAR=` no .env vira string vazia; tratamos como “não definido”. */
function optionalJwtSecret() {
  return z.preprocess(
    (v: unknown) => {
      if (v === undefined || v === null) return undefined;
      if (typeof v !== 'string') return v;
      const t = v.trim();
      return t === '' ? undefined : t;
    },
    /** Zod v4: `union(undefined, string)` falha para ausência real no ambiente; usar `.optional()`. */
    z.optional(z.string().min(16)),
  );
}

/**
 * Validates process.env once at bootstrap.
 */
export const EnvSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.coerce.number().int().positive().max(65535).default(3000),

    DB_HOST: z.string().min(1).default('localhost'),
    DB_PORT: z.coerce.number().int().positive().max(65535).default(5432),
    DB_USER: z.string().min(1).optional(),
    DB_PASSWORD: z.string().min(1).optional(),
    DB_NAME: z.string().min(1).optional(),

    JWT_SECRET: optionalJwtSecret(),
    JWT_ACCESS_SECRET: optionalJwtSecret(),
    JWT_REFRESH_SECRET: optionalJwtSecret(),
    JWT_ACCESS_EXPIRES_IN: z.string().min(2).default('15m'),
    JWT_REFRESH_EXPIRES_IN: z.string().min(2).default('7d'),

    CORS_ORIGINS: z
      .string()
      .default('http://localhost:4200,http://localhost:80,http://127.0.0.1:4200'),

    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

    THROTTLE_LOGIN_LIMIT: z.coerce.number().int().positive().default(15),
    THROTTLE_LOGIN_TTL_SEC: z.coerce.number().int().positive().default(60),

    THROTTLE_UPLOAD_LIMIT: z.coerce.number().int().positive().default(60),
    THROTTLE_UPLOAD_TTL_SEC: z.coerce.number().int().positive().default(3600),

    /** Tamanho máximo por arquivo de upload (validação também no servidor após gravar disco). */
    UPLOAD_MAX_FILE_BYTES: z.coerce.number().int().positive().max(20 * 1024 * 1024).default(5 * 1024 * 1024),

    SENTRY_DSN: z
      .string()
      .optional()
      .transform((v) => (v?.trim() ? v.trim() : undefined))
      .refine((v) => !v || /^https:\/\/.+/.test(v), 'SENTRY_DSN must be an HTTPS URL'),

    POSTGRES_USER: z.string().optional(),
    POSTGRES_PASSWORD: z.string().optional(),
    POSTGRES_DB: z.string().optional(),

    /** `true|false` omitido → SSL só se DB_HOST parecer Supabase (*.supabase.co). */
    DB_SSL: z
      .union([z.literal('true'), z.literal('false')])
      .optional()
      .transform((v) => (v === 'true' ? true : v === 'false' ? false : undefined)),

    /** Supabase Storage: URLs públicas entram nos campos `imagem_url` do Postgres (grátis até o limite do plano). */
    SUPABASE_URL: z
      .string()
      .optional()
      .transform((v) => (v?.trim() ? v.trim().replace(/\/+$/, '') : undefined))
      .refine((v) => !v || /^https:\/\/.+\.supabase\.co$/i.test(v), {
        message: 'SUPABASE_URL deve ser como https://<ref>.supabase.co',
      }),
    SUPABASE_SERVICE_ROLE_KEY: z
      .string()
      .optional()
      .transform((v) => (v?.trim() ? v.trim() : undefined))
      .refine((v) => !v || v.length >= 20, 'SUPABASE_SERVICE_ROLE_KEY too short'),
    SUPABASE_STORAGE_BUCKET: z.string().optional().transform((v) => v?.trim() || ''),
  })
  .transform((data) => {
    const accessSecret = data.JWT_ACCESS_SECRET ?? data.JWT_SECRET;
    if (!accessSecret) {
      throw new Error('Set JWT_ACCESS_SECRET or JWT_SECRET (min 16 characters).');
    }
    const refreshSecret = data.JWT_REFRESH_SECRET ?? derivedRefreshSecret(accessSecret);

    const dbPassword = data.DB_PASSWORD ?? data.POSTGRES_PASSWORD;
    const dbUser = data.DB_USER ?? data.POSTGRES_USER;
    const dbName = data.DB_NAME ?? data.POSTGRES_DB;
    if (!dbPassword || !dbUser || !dbName) {
      throw new Error('Database: set DB_USER, DB_PASSWORD, DB_NAME (or POSTGRES_* aliases).');
    }

    const supabaseUrl = data.SUPABASE_URL;
    const supabaseKey = data.SUPABASE_SERVICE_ROLE_KEY;
    if ((supabaseUrl && !supabaseKey) || (!supabaseUrl && supabaseKey)) {
      throw new Error(
        'Supabase Storage: definir SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY juntos (ou omitir ambos para gravar só em disco).',
      );
    }

    let dbSsl: boolean;
    if (data.DB_SSL === true) dbSsl = true;
    else if (data.DB_SSL === false) dbSsl = false;
    else dbSsl = /\.supabase\.co$/i.test(data.DB_HOST);

    let bucketName: string | null = null;
    if (supabaseUrl && supabaseKey) {
      const raw = (data.SUPABASE_STORAGE_BUCKET || '').trim().toLowerCase();
      bucketName = 'entrelinhas-uploads';
      if (raw) {
        if (!/^[a-z0-9-]{3,63}$/.test(raw)) {
          throw new Error(
            'SUPABASE_STORAGE_BUCKET deve ser minúsculo (3–63 chars, só a-z 0-9 e hífen).',
          );
        }
        bucketName = raw;
      }
    }

    return {
      nodeEnv: data.NODE_ENV,
      port: data.PORT,
      db: {
        host: data.DB_HOST,
        port: data.DB_PORT,
        user: dbUser,
        password: dbPassword,
        name: dbName,
      },
      dbSsl,
      jwt: {
        accessSecret,
        refreshSecret,
        accessExpiresIn: data.JWT_ACCESS_EXPIRES_IN,
        refreshExpiresIn: data.JWT_REFRESH_EXPIRES_IN,
      },
      cors: {
        origins: data.CORS_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean),
      },
      logLevel: data.LOG_LEVEL,
      throttle: {
        login: { limit: data.THROTTLE_LOGIN_LIMIT, ttlSec: data.THROTTLE_LOGIN_TTL_SEC },
        upload: { limit: data.THROTTLE_UPLOAD_LIMIT, ttlSec: data.THROTTLE_UPLOAD_TTL_SEC },
      },
      uploadMaxFileBytes: data.UPLOAD_MAX_FILE_BYTES,
      sentryDsn: data.SENTRY_DSN,
      supabase:
        supabaseUrl && supabaseKey && bucketName
          ? { url: supabaseUrl, serviceRoleKey: supabaseKey, bucket: bucketName }
          : null,
    };
  });

export type AppEnv = z.infer<typeof EnvSchema>;

let cachedEnv: AppEnv | null = null;

export function getValidatedEnv(raw: NodeJS.ProcessEnv = process.env): AppEnv {
  if (cachedEnv) return cachedEnv;
  const result = EnvSchema.safeParse(raw);
  if (!result.success) {
    const msg = JSON.stringify(result.error.format(), null, 2);
    throw new Error(`Invalid environment variables:\n${msg}`);
  }
  cachedEnv = result.data;
  return cachedEnv;
}
