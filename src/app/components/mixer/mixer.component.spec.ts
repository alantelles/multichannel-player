import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AudioEngineService } from '../../services/audio-engine.service';
import { ConfirmacaoDialogService } from '../../services/confirmacao-dialog.service';

import { MixerComponent } from './mixer.component';

describe('MixerComponent', () => {
  let component: MixerComponent;
  let fixture: ComponentFixture<MixerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MixerComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(MixerComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('allows leaving without confirmation when playback is stopped', async () => {
    const audio = TestBed.inject(AudioEngineService);
    const confirmacaoDialog = TestBed.inject(ConfirmacaoDialogService);
    const isPlaying = vi.spyOn(audio, 'isPlaying').mockReturnValue(false);
    const togglePlay = vi.spyOn(audio, 'togglePlay');
    const confirmar = vi.spyOn(confirmacaoDialog, 'confirmar');

    await expect(component.confirmarSaida()).resolves.toBe(true);

    expect(confirmar).not.toHaveBeenCalled();
    expect(togglePlay).not.toHaveBeenCalled();
    isPlaying.mockRestore();
    confirmar.mockRestore();
  });

  it('keeps playback running when leaving is canceled', async () => {
    const audio = TestBed.inject(AudioEngineService);
    const confirmacaoDialog = TestBed.inject(ConfirmacaoDialogService);
    const isPlaying = vi.spyOn(audio, 'isPlaying').mockReturnValue(true);
    const togglePlay = vi.spyOn(audio, 'togglePlay');
    const confirmar = vi.spyOn(confirmacaoDialog, 'confirmar').mockResolvedValue(false);

    await expect(component.confirmarSaida()).resolves.toBe(false);

    expect(confirmar).toHaveBeenCalledOnce();
    expect(togglePlay).not.toHaveBeenCalled();
    isPlaying.mockRestore();
    confirmar.mockRestore();
  });

  it('stops playback before allowing navigation when confirmed', async () => {
    const audio = TestBed.inject(AudioEngineService);
    const confirmacaoDialog = TestBed.inject(ConfirmacaoDialogService);
    const isPlaying = vi.spyOn(audio, 'isPlaying').mockReturnValue(true);
    const togglePlay = vi.spyOn(audio, 'togglePlay').mockResolvedValue(undefined);
    const confirmar = vi.spyOn(confirmacaoDialog, 'confirmar').mockResolvedValue(true);

    await expect(component.confirmarSaida()).resolves.toBe(true);

    expect(togglePlay).toHaveBeenCalledOnce();
    isPlaying.mockRestore();
    togglePlay.mockRestore();
    confirmar.mockRestore();
  });
});
