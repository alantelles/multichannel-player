import { Injectable } from '@angular/core';
import { HookExecutor } from '../hook-executor';
import { Evento } from '../../../models/evento';
import { HttpClient } from '@angular/common/http';

const getContentType = (contentType: string) => {
  switch (contentType) {
    case 'JSON':
      return 'application/json';
    case 'TEXT':
      return 'text/plain';
    default:
      return 'text/plain';
  }
}

@Injectable({  
  providedIn: 'root'
})
export class HttpClientHookService implements HookExecutor {
  static readonly HOOK_NAME = 'http-client';  
  name = 'http-client-hook';
  description = 'Emite uma requisição HTTP para um endpoint específico quando o compasso muda';

  constructor(private httpClient: HttpClient) {}
  execute(evento: Evento, config: any): void {
    const dadosEvento = evento.data;
    const url = config.url;
    const template = config.templates.find((t: any) => t.id === dadosEvento.template);
    if (!template) {
      console.error(`Template com id ${dadosEvento.template} não encontrado na configuração do hook.`);
      return;
    }
    const method = template.method || 'POST';
    const contentType = getContentType(template.contentType || 'TEXT');
    const path = template.path || '';
    const fullUrl = `${url}${path}`;
    const body = {...template.body};
    const headersConfig = config.headers || {};
    const headersEvento = dadosEvento.headers || {};
    const headersTemplate = template.headers || {};
    const headers = {...headersEvento, ...headersTemplate, ...headersConfig, 'Content-Type': contentType};
    
    body.content = body.content.replace('{{conteudo}}', dadosEvento.conteudo);
    // Aqui você pode usar o HttpClient do Angular para enviar a requisição HTTP
    // Exemplo:
    this.httpClient.request(method, fullUrl, { 
        body: JSON.stringify(body),
        headers: headers,
      })
      .subscribe(response => {
        console.log('Requisição HTTP enviada com sucesso:', response);
      }, error => {
        console.error('Erro ao enviar requisição HTTP:', error);
      });
    console.log(dadosEvento)
    console.log(`Enviando requisição HTTP para ${fullUrl} com método ${method}, headers: ${JSON.stringify(headers)} e dados:`, JSON.stringify(body));
  }
}
