import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { AudioEngineService, CanalAudio } from '../../services/audio-engine.service';
import { ConfirmacaoDialogService } from '../../services/confirmacao-dialog.service';

import { MixerComponent } from './mixer.component';

vi.mock('tone', () => {
  const context = { state: 'running', sampleRate: 48000, lookAhead: 0 };
  class VolumeMock {
    volume = { rampTo: vi.fn() };
    mute = false;
    connect = vi.fn();
  }

  return {
    Volume: VolumeMock,
    Destination: {},
    context,
    Transport: { bpm: { value: 120 }, timeSignature: 4 },
    getContext: () => context
  };
});

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

  it('renders the highlighted master fader and forwards its value', () => {
    const audio = TestBed.inject(AudioEngineService);
    audio.canais.set([{
      id: 'test-track',
      nome: 'Test track',
      arquivo: 'test.mp3',
      player: {} as CanalAudio['player'],
      volumeNode: {} as CanalAudio['volumeNode'],
      channelNode: {} as CanalAudio['channelNode'],
      volumeSignal: signal(0),
      isMuted: signal(false),
      isSoloed: signal(false),
      saidaAtiva: signal('Master')
    }]);
    fixture.detectChanges();
    const alterarVolumeMaster = vi.spyOn(audio, 'alterarVolumeMaster');
    const masterSlider = fixture.nativeElement.querySelector('.master-slider') as HTMLInputElement;
    const firstStrip = fixture.nativeElement.querySelector('.strips-container')?.firstElementChild as HTMLElement;

    expect(masterSlider).not.toBeNull();
    expect(firstStrip.classList.contains('master-strip')).toBe(true);
    expect(masterSlider.getAttribute('aria-label')).toBe('Volume master em decibéis');

    masterSlider.value = '-6';
    masterSlider.dispatchEvent(new Event('input'));

    expect(alterarVolumeMaster).toHaveBeenCalledWith(-6);
  });

  it('renders a master mute button with its current accessible state', () => {
    const audio = TestBed.inject(AudioEngineService);
    const alternarMuteMaster = vi.spyOn(audio, 'alternarMuteMaster');
    audio.canais.set([{
      id: 'test-track',
      nome: 'Test track',
      arquivo: 'test.mp3',
      player: {} as CanalAudio['player'],
      volumeNode: {} as CanalAudio['volumeNode'],
      channelNode: {} as CanalAudio['channelNode'],
      volumeSignal: signal(0),
      isMuted: signal(false),
      isSoloed: signal(false),
      saidaAtiva: signal('Master')
    }]);
    fixture.detectChanges();
    const masterMuteButton = fixture.nativeElement.querySelector('.master-strip button') as HTMLButtonElement;

    expect(masterMuteButton.getAttribute('aria-label')).toBe('Silenciar master');
    expect(masterMuteButton.getAttribute('aria-pressed')).toBe('false');
    masterMuteButton.click();
    expect(alternarMuteMaster).toHaveBeenCalledOnce();
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
