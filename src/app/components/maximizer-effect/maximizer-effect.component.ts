import { Component, inject } from '@angular/core';
import { AudioEngineService } from '../../services/audio-engine.service';

@Component({
  selector: 'app-maximizer-effect',
  templateUrl: './maximizer-effect.component.html',
  styleUrls: ['./maximizer-effect.component.scss', '../effects/effects.scss'],
})
export class MaximizerEffectComponent {
  protected readonly audio = inject(AudioEngineService);

  atualizarThreshold(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.audio.alterarMaximizerMasterThreshold(Number(input.value));
  }
}