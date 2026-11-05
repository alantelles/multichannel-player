import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import type { MixerComponent } from '../components/mixer/mixer.component';
import { confirmarSaidaMixerGuard } from './confirmar-saida-mixer.guard';

describe('confirmarSaidaMixerGuard', () => {
  const executarGuard = (component: MixerComponent) => confirmarSaidaMixerGuard(
    component,
    {} as ActivatedRouteSnapshot,
    {} as RouterStateSnapshot,
    {} as RouterStateSnapshot,
  );

  it('delegates the navigation decision to the mixer component', async () => {
    const confirmarSaida = vi.fn().mockResolvedValue(false);
    const component = { confirmarSaida } as unknown as MixerComponent;

    await expect(executarGuard(component)).resolves.toBe(false);
    expect(confirmarSaida).toHaveBeenCalledOnce();
  });
});