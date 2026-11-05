import { Component, inject, signal, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LatencySettingsService } from '../../services/latency-settings.service';
import { LATENCY_PROFILES, LatencyProfileKey } from '../../models/latency-config';

@Component({
  selector: 'app-latency-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './latency-modal.component.html',
  styleUrls: ['./latency-modal.component.scss']
})
export class LatencyModalComponent {
  private latencySettings = inject(LatencySettingsService);

  // Evento para fechar o modal
  fechar = output<void>();

  // Lista de perfis para renderizar na tela
  profiles = Object.values(LATENCY_PROFILES);

  // Signals locais para edição no modal
  selectedKey = signal<LatencyProfileKey>(this.latencySettings.selectedProfileKey());
  customMs = signal<number>(this.latencySettings.customLookaheadMs());
  offsetMs = signal<number>(this.latencySettings.offsetMs());

  selecionarPerfil(key: LatencyProfileKey): void {
    this.selectedKey.set(key);
  }

  salvarEFechar(): void {
    const key = this.selectedKey();
    
    if (key === 'custom') {
      this.latencySettings.setCustomLookahead(this.customMs());
    } else {
      this.latencySettings.setProfile(key);
    }

    this.latencySettings.setOffsetMs(this.offsetMs());
    this.fechar.emit();
  }
}