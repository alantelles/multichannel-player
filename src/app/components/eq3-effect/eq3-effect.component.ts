import { Component, inject } from '@angular/core';
import { AudioEngineService } from '../../services/audio-engine.service';

@Component({
  selector: 'app-eq3-effect',
  templateUrl: './eq3-effect.component.html',
  styleUrls: ['./eq3-effect.component.scss', '../effects/effects.scss'],
})
export class Eq3EffectComponent {
  protected readonly audio = inject(AudioEngineService);

  atualizarGanho(banda: 'low' | 'mid' | 'high', event: Event): void {
    const input = event.target as HTMLInputElement;
    this.audio.alterarEqMaster(banda, Number(input.value));
  }
}