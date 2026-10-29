import { Injectable, signal, computed } from '@angular/core';
import { LATENCY_PROFILES, LatencyProfile, LatencyProfileKey } from '../models/latency-config';

@Injectable({
  providedIn: 'root'
})
export class LatencySettingsService {
  private readonly STORAGE_PROFILE_KEY = 'app_latency_profile';
  private readonly STORAGE_LOOKAHEAD_KEY = 'app_latency_lookahead';
  private readonly STORAGE_OFFSET_KEY = 'app_latency_offset';

  // Signals do estado atual
  readonly selectedProfileKey = signal<LatencyProfileKey>(this.loadInitialProfile());
  readonly customLookaheadMs = signal<number>(this.loadInitialLookahead());
  readonly offsetMs = signal<number>(this.loadInitialOffset());

  // Signal computado com as configurações ativas que o AudioEngineService vai consumir
  readonly activeConfig = computed(() => {
    const key = this.selectedProfileKey();
    
    if (key === 'custom') {
      return {
        lookaheadMs: this.customLookaheadMs(),
        scheduleIntervalMs: Math.max(10, Math.floor(this.customLookaheadMs() / 4)),
        offsetMs: this.offsetMs()
      };
    }

    const profile = LATENCY_PROFILES[key] || LATENCY_PROFILES['safe'];
    return {
      lookaheadMs: profile.lookaheadMs,
      scheduleIntervalMs: profile.scheduleIntervalMs,
      offsetMs: this.offsetMs()
    };
  });

  // Métodos de atualização
  setProfile(key: LatencyProfileKey): void {
    this.selectedProfileKey.set(key);
    localStorage.setItem(this.STORAGE_PROFILE_KEY, key);
  }

  setCustomLookahead(ms: number): void {
    this.customLookaheadMs.set(ms);
    this.selectedProfileKey.set('custom');
    localStorage.setItem(this.STORAGE_PROFILE_KEY, 'custom');
    localStorage.setItem(this.STORAGE_LOOKAHEAD_KEY, ms.toString());
  }

  setOffsetMs(ms: number): void {
    this.offsetMs.set(ms);
    localStorage.setItem(this.STORAGE_OFFSET_KEY, ms.toString());
  }

  // Auxiliares de leitura inicial
  private loadInitialProfile(): LatencyProfileKey {
    const saved = localStorage.getItem(this.STORAGE_PROFILE_KEY) as LatencyProfileKey;
    return saved && LATENCY_PROFILES[saved] ? saved : 'safe'; // Padrão seguro (300ms)
  }

  private loadInitialLookahead(): number {
    const saved = localStorage.getItem(this.STORAGE_LOOKAHEAD_KEY);
    return saved ? Number(saved) : 300;
  }

  private loadInitialOffset(): number {
    const saved = localStorage.getItem(this.STORAGE_OFFSET_KEY);
    return saved ? Number(saved) : 0;
  }
}