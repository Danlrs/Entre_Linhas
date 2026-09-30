export interface User {
  id: number;
  email: string;
  login: string;
  nome: string;
  password: string;
  telefone?: string;
  googleSubject?: string | null;
}
