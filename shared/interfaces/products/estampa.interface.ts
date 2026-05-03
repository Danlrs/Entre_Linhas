export interface Estampa {
  id: number;
  nome: string;
  imagemUrl?: string | null;
  valorAdicional?: number;
}

export interface EstampaPayload {
  nome: string;
  imagemUrl?: string | null;
  valorAdicional?: number;
}
