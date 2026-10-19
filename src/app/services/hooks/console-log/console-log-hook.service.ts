import { Injectable } from '@angular/core';
import { HookExecutor } from '../hook-executor';

@Injectable({  
  providedIn: 'root'
})
export class ConsoleLogHookService implements HookExecutor {
  static readonly HOOK_NAME = 'console-log';  
  name = 'Console Log Hook';
  description = 'A simple hook for logging messages to the console';

  execute(...args: any[]): void {
    console.log(`Rodando o compasso ${args[0]}!`);
  }

}
