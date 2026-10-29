// src/app/models/evento.ts
export interface HttpClientEventData {
  template: string;
  conteudo: string;
  headers?: Record<string, string>;
}

export interface Evento {
  compasso?: number;
  hook: string; // ID da integração (ex: "client-presenter")
  data: string | HttpClientEventData; // Tipagem específica em vez de 'any'
}