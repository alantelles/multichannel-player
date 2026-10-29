export interface HttpClientTemplate {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  contentType?: 'JSON' | 'TEXT' | 'FORM';
  body?: any;
  headers?: Record<string, string>;
}

export interface HttpClientConfig {
  url: string;
  templates: HttpClientTemplate[];
  headers?: Record<string, string>;
}