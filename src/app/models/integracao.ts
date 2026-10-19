export interface SimpleConfig {
  conteudo: string;
}

export interface Integracao<T = any> {
  engine: string;
  id: string;
  config?: T;
}