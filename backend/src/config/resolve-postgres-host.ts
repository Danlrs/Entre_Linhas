import { resolve4 } from 'node:dns/promises';

/**
 * Render (e similares) frequentemente não roteiam IPv6 até o Supabase (`ENETUNREACH`).
 * Usar o endereço IPv4 do registro A evita isso. Para TLS, o nome do servidor continua
 * sendo o hostname lógico (veja `servername` na config SSL do TypeORM).
 */
export async function resolvePostgresHostForConnection(hostname: string): Promise<string> {
  if (!hostname || !/supabase\.co$/i.test(hostname)) {
    return hostname;
  }
  try {
    const v4 = await resolve4(hostname);
    if (v4.length > 0) return v4[0];
  } catch {
    // mantém hostname
  }
  return hostname;
}
