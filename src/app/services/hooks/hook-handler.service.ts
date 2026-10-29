import { inject, Injectable } from '@angular/core';
import { HookExecutor } from './hook-executor';
import { ConsoleLogHookService } from './console-log/console-log-hook.service';
import { Evento } from '../../models/evento';
import { HttpClientHookService } from './http-client/http-client-hook.service';
import { Integracao } from '../../models/integracao';

interface AcumuladorHook {
  melhor?: Evento;
  padrao?: Evento;
}

@Injectable({
  providedIn: 'root'
})
export class HookHandlerService {

  private consoleLogHookService: ConsoleLogHookService = inject(ConsoleLogHookService);
  private httpClientHookService: HttpClientHookService = inject(HttpClientHookService);  
  // Mapeia engines para executores genéricos
  private executors: { [key: string]: HookExecutor<any> } = {};  
  private eventos = new Set<Evento>();
  private eventosAtuais = new Set<Evento>();
  private integracoesMap = new Map<string, { engine: string, config: any }>();

  constructor() {
    this.executors[ConsoleLogHookService.HOOK_NAME] = this.consoleLogHookService;
    this.executors[HttpClientHookService.HOOK_NAME] = this.httpClientHookService;
  }

  registrarEventos(eventos: Evento[]): void {
    this.eventos = new Set(eventos);
  }

  registrarIntegracoes(integracoes: Integracao[]): void {
    this.integracoesMap.clear();
    if (integracoes) {
      integracoes.forEach(integ => {
        this.integracoesMap.set(integ.id, { engine: integ.engine, config: integ.config || {} });
      });
    }
  }

  dispararCorrespondentes(compasso: number): void {
    const mapaHooks = Array.from(this.eventos).reduce<Record<string, AcumuladorHook>>((acc, evento) => {
      if (!acc[evento.hook]) {
        acc[evento.hook] = {};
      }
      const grupo = acc[evento.hook];
      
      if (evento.compasso === undefined || evento.compasso === null) {
        grupo.padrao = evento;
      }
      else if (evento.compasso <= compasso) {
        if (!grupo.melhor || evento.compasso > grupo.melhor.compasso!) {
          grupo.melhor = evento;
        }
      }

      return acc;
    }, {});

    const eventosCandidatos = Object.values(mapaHooks)
      .map(grupo => grupo.melhor || grupo.padrao)
      .filter((evento): evento is Evento => !!evento);

    const obterId = (e: Evento) => {
      const sufixoCompasso = (e.compasso === undefined || e.compasso === null) ? 'atemporal' : e.compasso;
      return `${e.hook}-${sufixoCompasso}`;
    };

    const chavesAtivas = new Set(Array.from(this.eventosAtuais).map(obterId));
    const eventosParaDisparo = eventosCandidatos.filter(evento => !chavesAtivas.has(obterId(evento)));
    
    this.eventosAtuais = new Set(eventosCandidatos);
    eventosParaDisparo.forEach(evento => this.executarHook(evento));
  }

  dispararEventosPadrao(): void {
    // Pega todos os eventos cadastrados que não têm compasso definido (os padrões/atemporais)
    const eventosPadrao = Array.from(this.eventos).filter(
      evento => evento.compasso === undefined || evento.compasso === null
    );

    // Executa cada um deles para resetar o estado nas integrações (ex: limpar o teleprompter)
    eventosPadrao.forEach(evento => {
      this.executarHook(evento);
    });

    // Limpa o set de eventos atuais para garantir que o próximo Play comece limpo
    this.eventosAtuais.clear();
  }
  executarHook(evento: Evento): void {
    try {
      const idIntegracao = evento.hook;
      const integracao = this.integracoesMap.get(idIntegracao);
      
      if (integracao) {
        const executor = this.executors[integracao.engine];
        if (executor) {
          executor.execute(evento, integracao.config);
        } else {
          console.warn(`[HookHandler] Engine '${integracao.engine}' não encontrada.`);
        }
      } else {
        const executorDireto = this.executors[idIntegracao];
        if (executorDireto) {
          executorDireto.execute(evento, {});
        } else {
          console.warn(`[HookHandler] Nenhuma integração encontrada para: '${idIntegracao}'.`);
        }
      }
    } catch (error) {
      console.error(`Erro ao executar o hook ${evento.hook} no compasso ${evento.compasso}:`, error);
    }
  }
}