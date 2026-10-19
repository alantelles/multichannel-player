import { Evento } from "../../models/evento";

export interface HookExecutor {
  name: string;
  description?: string;
  execute(evento: Evento, config: any): void;
}