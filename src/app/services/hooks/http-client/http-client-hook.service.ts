import { Injectable } from '@angular/core';
import { HookExecutor } from '../hook-executor';
import { Evento, HttpClientEventData } from '../../../models/evento';
import { HttpClient } from '@angular/common/http';
import { HttpClientConfig } from '../../../models/integracao';

const REGEX_CONTEUDO = /\$\(conteudo\)/g;

const getContentType = (contentType: string) => {
  switch (contentType) {
    case 'JSON':
      return 'application/json';
    case 'TEXT':
    default:
      return 'text/plain';
  }
};

@Injectable({  
  providedIn: 'root'
})
export class HttpClientHookService implements HookExecutor<HttpClientConfig> {
  static readonly HOOK_NAME = 'http-client';  
  name = 'http-client-hook';
  description = 'Emite uma requisição HTTP para um endpoint específico quando o compasso muda';

  constructor(private httpClient: HttpClient) {}

  execute(evento: Evento, config: HttpClientConfig): void {
    // Garante que o data é o payload esperado do HTTP client
    const dadosEvento = evento.data as HttpClientEventData;
    if (!dadosEvento || typeof dadosEvento === 'string') {
      console.error(`[HttpClientHook] Dados inválidos para o evento do tipo http-client.`);
      return;
    }

    const url = config.url;
    const template = config.templates.find(t => t.id === dadosEvento.template);
    
    if (!template) {
      console.error(`[HttpClientHook] Template com id '${dadosEvento.template}' não encontrado na configuração.`);
      return;
    }

    const method = template.method || 'POST';
    const contentType = getContentType(template.contentType || 'TEXT');
    const fullUrl = `${url}${template.path || ''}`;
    // Se o conteudo for um objeto, serializamos ele antes de injetar na string do template
    let body = template.body ? template.body.replace(REGEX_CONTEUDO, dadosEvento.conteudo) : undefined;

    const headers = {
      ...(config.headers || {}),
      ...(template.headers || {}),
      ...(dadosEvento.headers || {}),
      'Content-Type': contentType
    };

    this.httpClient.request(method, fullUrl, {body, headers})
      .subscribe({
        next: response => console.log('[HttpClientHook] Sucesso:', response),
        error: error => console.error('[HttpClientHook] Erro na requisição:', error)
      });
  }
}