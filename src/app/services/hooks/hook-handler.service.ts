import { inject, Injectable } from '@angular/core';
import { Hook } from './hook';
import { ConsoleLogHookService } from './console-log-hook.service';

@Injectable({
  providedIn: 'root'
})
export class HookHandlerService {

  private hooks: Hook[] = [];
  private consoleLogHookService: ConsoleLogHookService = inject(ConsoleLogHookService);

  constructor() {
    this.hooks.push(this.consoleLogHookService);
  }

  execute(...args: any[]): void {
    this.hooks.forEach(hook => hook.execute(...args));
  }

}
