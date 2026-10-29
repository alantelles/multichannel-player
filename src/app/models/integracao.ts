// src/app/models/integracao.ts
export interface HttpClientTemplate {
  id: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  contentType: 'JSON' | 'TEXT';
  body?: string;
  headers?: Record<string, string>;
}

export interface HttpClientConfig {
  url: string;
  templates: HttpClientTemplate[];
  headers?: Record<string, string>;
}

export interface Integracao<T = any> {
  engine: string;
  id: string;
  config?: T;
}