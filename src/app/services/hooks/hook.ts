export interface Hook {
  name: string;
  description?: string;
  execute(...args: any[]): void;
}