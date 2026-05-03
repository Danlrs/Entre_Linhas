export interface Material {
  id: number;
  nome: string;
  tipo?: string | null;
  imagemUrl?: string | null;
}

export interface MaterialPayload {
  nome: string;
  tipo?: string | null;
  imagemUrl?: string | null;
}
