import { Component, inject, signal } from '@angular/core';
import { AudioEngineService } from '../../services/audio-engine.service';

@Component({
  selector: 'app-maximizer-effect',
  templateUrl: './maximizer-effect.component.html',
  styleUrls: ['./maximizer-effect.component.scss', '../effects/effects.scss'],
})
export class MaximizerEffectComponent {
  protected readonly audio = inject(AudioEngineService);
  protected readonly actionMessage = signal('');

  atualizarThreshold(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.audio.alterarMaximizerMasterThreshold(Number(input.value));
  }

  resetar(): void {
    this.audio.resetarMaximizerMaster();
    this.actionMessage.set('Maximizer restaurado.');
  }

  usarSalvo(): void {
    this.actionMessage.set(this.audio.usarMaximizerMasterSalvo()
      ? 'Ajustes salvos aplicados ao maximizer.'
      : 'Nenhum ajuste salvo encontrado.');
  }
}