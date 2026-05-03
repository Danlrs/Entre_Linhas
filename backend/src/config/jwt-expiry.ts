/** Same shape as Nest/jsonwebtoken `expiresIn`: number (seconds) or string like `15m`, `7d`. */
export function jwtExpiryToMilliseconds(expiresIn: string): number {
  const s = expiresIn.trim();
  const unitMatch = /^(\d+)(s|m|h|d|w)$/.exec(s);
  if (!unitMatch) {
    throw new Error(`JWT expiry inválido: "${expiresIn}" (use ex.: 15m, 7d).`);
  }
  const n = parseInt(unitMatch[1], 10);
  const unit = unitMatch[2];
  const ms =
    unit === 's'
      ? 1000
      : unit === 'm'
        ? 60_000
        : unit === 'h'
          ? 3_600_000
          : unit === 'd'
            ? 86_400_000
            : 604_800_000;
  return n * ms;
}
