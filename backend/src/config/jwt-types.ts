import type { SignOptions } from 'jsonwebtoken';

/** Alinha ao tipo mais estrito de `jsonwebtoken` (nest v11). */
export function jwtExpires(value: string): SignOptions['expiresIn'] {
  return value as SignOptions['expiresIn'];
}
