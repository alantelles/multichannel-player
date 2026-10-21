// src/app/services/hooks/hook-executor.ts
import { Evento } from '../../models/evento';

export interface HookExecutor<T = any> {
  name: string;
  description?: string;
  execute(evento: Evento, config: T): void;
}