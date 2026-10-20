import { Injectable } from '@angular/core';
import { HookExecutor } from '../hook-executor';
import { Evento } from '../../../models/evento';

@Injectable({  
  providedIn: 'root'
})
export class HttpClientHookService implements HookExecutor {
  static readonly HOOK_NAME = 'http-client';  
  name = 'http-client-hook';
  description = 'Emite uma requisição HTTP para um endpoint específico quando o compasso muda';

  execute(evento: Evento, config: any): void {
    const dadosEvento = evento.data;
    const url = config.url;
    const template = config.templates.find((t: any) => t.id === dadosEvento.template);
    if (!template) {
      console.error(`Template com id ${dadosEvento.template} não encontrado na configuração do hook.`);
      return;
    }
    const method = template.method || 'POST';
    const contentType = template.contentType == 'JSON' ? 'application/json' : 'text/plain';
    const path = template.path || '';
    const fullUrl = `${url}${path}`;
    const body = template.body;
    body.conteudo = body.conteudo.replace('{{conteudo}}', dadosEvento.conteudo);
    // Aqui você pode usar o HttpClient do Angular para enviar a requisição HTTP
    // Exemplo:
    // this.httpClient.request(method, fullUrl, { body: dadosEvento, headers: { 'Content-Type': contentType } })
    //   .subscribe(response => {
    //     console.log('Requisição HTTP enviada com sucesso:', response);
    //   }, error => {
    //     console.error('Erro ao enviar requisição HTTP:', error);
    //   });

    console.log(`Enviando requisição HTTP para ${fullUrl} com método ${method} e dados:`, JSON.stringify(body));
  }
}
