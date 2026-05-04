import { setDefaultResultOrder } from 'node:dns';

/**
 * Supabase DNS devolve AAAA (IPv6); em Render o cliente tenta IPv6 primeiro e pode falhar com
 * `connect ENETUNREACH ... :5432`. Preferir IPv4 evita isso (Node 18+).
 */
setDefaultResultOrder('ipv4first');
