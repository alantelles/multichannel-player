import { Injectable } from '@angular/core';
import { HookExecutor } from '../hook-executor';

@Injectable({  
  providedIn: 'root'
})
export class HttpClientHookService implements HookExecutor {
  static readonly HOOK_NAME = 'http-client';  
  name = 'http-client-hook';
  description = 'Emite uma requisição HTTP para um endpoint específico quando o compasso muda';

  execute(...args: any[]): void {
    // Implementation for HTTP client hook
  }
}
