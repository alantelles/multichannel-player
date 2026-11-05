import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
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
  class EQ3Mock {
    low = { rampTo: vi.fn() };
    mid = { rampTo: vi.fn() };
    high = { rampTo: vi.fn() };
    connect = vi.fn();
  }

  return {
    Volume: VolumeMock,
    EQ3: EQ3Mock,
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
      panSignal: signal(0),
      isMuted: signal(false),
      isSoloed: signal(false),
      saidaAtiva: signal('Master')
    }]);
    fixture.detectChanges();
    const alterarVolumeMaster = vi.spyOn(audio, 'alterarVolumeMaster');
    const masterSlider = fixture.nativeElement.querySelector('.master-slider') as HTMLInputElement;
    const firstStrip = fixture.nativeElement.querySelector('.strips-container')?.firstElementChild as HTMLElement;

    expect(masterSlider).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.master-eq')).toBeNull();
    expect(firstStrip.classList.contains('master-strip')).toBe(true);
    expect(masterSlider.getAttribute('aria-label')).toBe('Volume master em decibéis');
    expect(fixture.nativeElement.querySelector('.master-strip .pan-slider')).toBeNull();
    const panSlider = fixture.nativeElement.querySelector('.channel-strip:not(.master-strip) .pan-slider') as HTMLInputElement;
    expect(panSlider).not.toBeNull();
    expect(panSlider.min).toBe('-50');
    expect(panSlider.max).toBe('50');
    expect(component.formatarPan(-1)).toBe('L 50');
    expect(component.formatarPan(0)).toBe('0');
    expect(component.formatarPan(1)).toBe('R 50');
    const alterarPan = vi.spyOn(audio, 'alterarPan').mockImplementation(() => {});
    panSlider.value = '25';
    panSlider.dispatchEvent(new Event('input'));
    expect(alterarPan).toHaveBeenCalledWith(audio.canais()[0], 0.5);
    panSlider.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    expect(alterarPan).toHaveBeenNthCalledWith(2, audio.canais()[0], 0);
    const masterName = fixture.nativeElement.querySelector('.master-strip .strip-channel-name') as HTMLElement;
    expect(masterName.classList.contains('channel-reset-control')).toBe(true);

    masterSlider.value = '-6';
    masterSlider.dispatchEvent(new Event('input'));
    masterName.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    const criarToque = (timestamp: number) => {
      const event = new Event('touchend', { bubbles: true, cancelable: true });
      Object.defineProperties(event, {
        changedTouches: { value: { length: 1 } },
        timeStamp: { value: timestamp }
      });
      return event;
    };
    masterName.dispatchEvent(criarToque(100));
    const secondTap = criarToque(250);
    masterName.dispatchEvent(secondTap);

    expect(alterarVolumeMaster).toHaveBeenNthCalledWith(1, -6);
    expect(alterarVolumeMaster).toHaveBeenNthCalledWith(2, 0);
    expect(alterarVolumeMaster).toHaveBeenNthCalledWith(3, 0);
    expect(audio.masterVolume()).toBe(0);
    expect(secondTap.defaultPrevented).toBe(true);
  });

  it('resets a channel volume to 0 dB when its name is double-clicked', () => {
    const audio = TestBed.inject(AudioEngineService);
    const channel = {
      id: 'test-track',
      nome: 'Test track',
      arquivo: 'test.mp3',
      player: {} as CanalAudio['player'],
      volumeNode: {} as CanalAudio['volumeNode'],
      channelNode: {} as CanalAudio['channelNode'],
      volumeSignal: signal(-12),
      panSignal: signal(0),
      isMuted: signal(false),
      isSoloed: signal(false),
      saidaAtiva: signal('Master')
    } satisfies CanalAudio;
    audio.canais.set([channel]);
    fixture.detectChanges();
    const alterarVolume = vi.spyOn(audio, 'alterarVolume').mockImplementation(() => {});
    const channelName = fixture.nativeElement.querySelector('.channel-strip:not(.master-strip) .strip-channel-name') as HTMLElement;

    expect(channelName.title).toContain('para zerar o volume');
    channelName.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));

    expect(alterarVolume).toHaveBeenCalledWith(channel, 0);
  });

  it('resets a channel volume on a mobile double-tap', () => {
    const audio = TestBed.inject(AudioEngineService);
    const channel = {
      id: 'test-track',
      nome: 'Test track',
      arquivo: 'test.mp3',
      player: {} as CanalAudio['player'],
      volumeNode: {} as CanalAudio['volumeNode'],
      channelNode: {} as CanalAudio['channelNode'],
      volumeSignal: signal(-12),
      panSignal: signal(0),
      isMuted: signal(false),
      isSoloed: signal(false),
      saidaAtiva: signal('Master')
    } satisfies CanalAudio;
    audio.canais.set([channel]);
    fixture.detectChanges();
    const alterarVolume = vi.spyOn(audio, 'alterarVolume').mockImplementation(() => {});
    const channelName = fixture.nativeElement.querySelector('.channel-strip:not(.master-strip) .strip-channel-name') as HTMLElement;
    const criarToque = (timestamp: number) => {
      const event = new Event('touchend', { bubbles: true, cancelable: true });
      Object.defineProperties(event, {
        changedTouches: { value: { length: 1 } },
        timeStamp: { value: timestamp }
      });
      return event;
    };

    channelName.dispatchEvent(criarToque(100));
    const secondTap = criarToque(250);
    channelName.dispatchEvent(secondTap);

    expect(alterarVolume).toHaveBeenCalledWith(channel, 0);
    expect(secondTap.defaultPrevented).toBe(true);
  });

  it('resets a channel pan on a mobile double-tap', () => {
    const audio = TestBed.inject(AudioEngineService);
    const channel = {
      id: 'test-track',
      nome: 'Test track',
      arquivo: 'test.mp3',
      player: {} as CanalAudio['player'],
      volumeNode: {} as CanalAudio['volumeNode'],
      channelNode: {} as CanalAudio['channelNode'],
      volumeSignal: signal(0),
      panSignal: signal(0.5),
      isMuted: signal(false),
      isSoloed: signal(false),
      saidaAtiva: signal('Master')
    } satisfies CanalAudio;
    audio.canais.set([channel]);
    fixture.detectChanges();
    const alterarPan = vi.spyOn(audio, 'alterarPan').mockImplementation(() => {});
    const panSlider = fixture.nativeElement.querySelector('.pan-slider') as HTMLInputElement;
    const criarToque = (timestamp: number) => {
      const event = new Event('touchend', { bubbles: true, cancelable: true });
      Object.defineProperties(event, {
        changedTouches: { value: { length: 1 } },
        timeStamp: { value: timestamp }
      });
      return event;
    };

    panSlider.dispatchEvent(criarToque(100));
    const secondTap = criarToque(250);
    panSlider.dispatchEvent(secondTap);

    expect(alterarPan).toHaveBeenCalledWith(channel, 0);
    expect(secondTap.defaultPrevented).toBe(true);
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
      panSignal: signal(0),
      isMuted: signal(false),
      isSoloed: signal(false),
      saidaAtiva: signal('Master')
    }]);
    fixture.detectChanges();
    const masterMuteButton = fixture.nativeElement.querySelector('.master-strip .strip-button:not(.fx-button)') as HTMLButtonElement;

    expect(masterMuteButton.getAttribute('aria-label')).toBe('Silenciar master');
    expect(masterMuteButton.getAttribute('aria-pressed')).toBe('false');
    masterMuteButton.click();
    expect(alternarMuteMaster).toHaveBeenCalledOnce();
  });

  it('opens the master effects dialog from the FX button next to mute', () => {
    const audio = TestBed.inject(AudioEngineService);
    audio.canais.set([{
      id: 'test-track',
      nome: 'Test track',
      arquivo: 'test.mp3',
      player: {} as CanalAudio['player'],
      volumeNode: {} as CanalAudio['volumeNode'],
      channelNode: {} as CanalAudio['channelNode'],
      volumeSignal: signal(0),
      panSignal: signal(0),
      isMuted: signal(false),
      isSoloed: signal(false),
      saidaAtiva: signal('Master')
    }]);
    fixture.detectChanges();
    const openDialog = vi.spyOn(MatDialog.prototype, 'open');
    const fxButton = fixture.nativeElement.querySelector('.master-strip .fx-button') as HTMLButtonElement;
    const muteButton = fixture.nativeElement.querySelector('.master-strip .strip-button:not(.fx-button)') as HTMLButtonElement;

    expect(fxButton.textContent.trim()).toBe('FX');
    expect(fxButton.nextElementSibling).toBe(muteButton);
    fxButton.click();

    expect(openDialog).toHaveBeenCalledOnce();
    expect(openDialog.mock.calls[0][1]).toMatchObject({ ariaLabel: 'Efeitos do master' });
    openDialog.mockRestore();
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
