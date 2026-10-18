import { inject, Injectable } from '@angular/core';
import { HookExecutor } from './hook-executor';
import { ConsoleLogHookService } from './console-log-hook.service';
import { Evento } from '../../models/evento';

@Injectable({
  providedIn: 'root'
})
export class HookHandlerService {

  private consoleLogHookService: ConsoleLogHookService = inject(ConsoleLogHookService);
  private executors: { [key: string]: HookExecutor } = {};
  private eventos: Evento[] = [];

  constructor() {
    this.executors[ConsoleLogHookService.HOOK_NAME] = this.consoleLogHookService;
  }

  registrarEventos(eventos: Evento[]): void {
    this.eventos = eventos;
  }

  dispararCorrespondentes(compasso: number): void {
    console.log(this.eventos)
    const eventos = this.eventos.filter(evento => evento.compasso === compasso);
    eventos.forEach(evento => this.executarHook(evento));
  }

  executarHook(evento: Evento): void {
    const executor = this.executors[evento.nomeDisparador];
    if (executor) {
      executor.execute(evento.conteudo);
    } else {
      console.warn(`Executor não encontrado para o disparador: ${evento.nomeDisparador}`);
    }
  }

}
