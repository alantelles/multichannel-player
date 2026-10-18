import { Injectable } from '@angular/core';
import { Hook } from './hook';

@Injectable({  
  providedIn: 'root'
})
export class ConsoleLogHookService implements Hook {
  name = 'Console Log Hook';
  description = 'A simple hook for logging messages to the console';

  execute(...args: any[]): void {
    console.log(`Rodando o compasso ${args[0]}!`);
  }

}
