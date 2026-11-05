import { CanDeactivateFn } from '@angular/router';
import type { MixerComponent } from '../components/mixer/mixer.component';

export const confirmarSaidaMixerGuard: CanDeactivateFn<MixerComponent> = async component =>
  component.confirmarSaida();