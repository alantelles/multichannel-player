export interface HookExecutor {
  name: string;
  description?: string;
  execute(...args: any[]): void;
}