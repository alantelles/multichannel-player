export type LatencyProfileKey = 'ultra-low' | 'low' | 'balanced' | 'safe' | 'super-safe' | 'custom';

export interface LatencyProfile {
  key: LatencyProfileKey;
  label: string;
  description: string;
  lookaheadMs: number; // Intervalo em ms que o scheduler olha para frente
  scheduleIntervalMs: number; // Frequência em ms do setInterval do clock
}

export const LATENCY_PROFILES: Record<LatencyProfileKey, LatencyProfile> = {
  'ultra-low': {
    key: 'ultra-low',
    label: 'Ultra Baixa (20ms)',
    description: 'Resposta instantânea. Para PCs potentes ou tablets high-end.',
    lookaheadMs: 20,
    scheduleIntervalMs: 15
  },
  'low': {
    key: 'low',
    label: 'Baixa (100ms)',
    description: 'Ótima resposta tátil para aparelhos intermediários fortes.',
    lookaheadMs: 100,
    scheduleIntervalMs: 25
  },
  'balanced': {
    key: 'balanced',
    label: 'Equilibrada (150ms)',
    description: 'Bom balanço entre estabilidade e tempo de resposta ao toque.',
    lookaheadMs: 150,
    scheduleIntervalMs: 35
  },
  'safe': {
    key: 'safe',
    label: 'Segura / Palco (300ms)',
    description: 'Máxima estabilidade anti-engasgo. Pode tornar operação em tempo real mais difícil.',
    lookaheadMs: 300,
    scheduleIntervalMs: 50
  },
  'super-safe': {
    key: 'super-safe',
    label: 'Super Segura (500ms)',
    description: 'Estabilidade máxima anti-engasgo. Recomendada para ambientes críticos. Recomendado apenas para playbacks de música completa ou com trechos longos.',
    lookaheadMs: 500,
    scheduleIntervalMs: 75
  },
  'custom': {
    key: 'custom',
    label: 'Personalizado',
    description: 'Ajuste fino manual.',
    lookaheadMs: 150,
    scheduleIntervalMs: 35
  }
};