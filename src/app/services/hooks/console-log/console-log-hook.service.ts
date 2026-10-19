import { Injectable } from '@angular/core';
import { HookExecutor } from '../hook-executor';
import { Evento } from '../../../models/evento';

@Injectable({  
  providedIn: 'root'
})
export class ConsoleLogHookService implements HookExecutor {
  static readonly HOOK_NAME = 'console-log';  
  name = 'Console Log Hook';
  description = 'A simple hook for logging messages to the console';

  execute(evento: Evento, config: any): void {
    console.log(`Compasso: ${evento.compasso}; Conteudo: ${evento.conteudo}`);
  }

}
