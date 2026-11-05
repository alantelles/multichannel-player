import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import * as Tone from 'tone';
import { CanalAudio, AudioEngineService } from './audio-engine.service';
import { FileRepositoryService } from './file-repository.service';
import { HookHandlerService } from './hooks/hook-handler.service';
import { LatencySettingsService } from './latency-settings.service';

const toneMocks = vi.hoisted(() => {
  const context = { state: 'running', currentTime: 12, sampleRate: 48000, lookAhead: 0, resume: vi.fn() };
  const transport = {
    bpm: { value: 120 },
    timeSignature: 4,
    seconds: 12,
    position: 0,
    start: vi.fn(),
    stop: vi.fn(),
    cancel: vi.fn(),
    clear: vi.fn(),
    scheduleOnce: vi.fn(),
    getSecondsAtTime: vi.fn((time: number) => time)
  };
  return { context, transport, start: vi.fn(), loaded: vi.fn(), time: vi.fn(), immediate: vi.fn() };
});

vi.mock('tone', () => {
  class PlayerMock {
    loaded = true;
    buffer = { duration: 10, url: '' };
    stop = vi.fn();
    start = vi.fn();
    dispose = vi.fn();
    chain = vi.fn();
    constructor(options: { url: string }) {
      this.buffer.url = options.url;
      this.buffer.duration = options.url.includes('long') ? 14 : 8;
    }
  }
  class VolumeMock {
    volume = { rampTo: vi.fn() };
    dispose = vi.fn();
  }
  class ChannelMock {
    mute = false;
    solo = false;
    disconnect = vi.fn();
    connect = vi.fn();
    dispose = vi.fn();
  }
  return {
    context: toneMocks.context,
    Transport: toneMocks.transport,
    Destination: {},
    Player: PlayerMock,
    Volume: VolumeMock,
    Channel: ChannelMock,
    start: toneMocks.start,
    loaded: toneMocks.loaded,
    getContext: () => toneMocks.context,
    Time: toneMocks.time,
    immediate: toneMocks.immediate
  };
});

describe('AudioEngineService', () => {
  let service: AudioEngineService;
  let fileRepository: { getFileUrl: ReturnType<typeof vi.fn> };
  let hookService: {
    dispararCorrespondentes: ReturnType<typeof vi.fn>;
    dispararEventosPadrao: ReturnType<typeof vi.fn>;
    registrarEventos: ReturnType<typeof vi.fn>;
    registrarIntegracoes: ReturnType<typeof vi.fn>;
  };
  let latencySettings: { activeConfig: ReturnType<typeof signal> };

  const marker = (id: string, extra: Record<string, unknown> = {}) => ({
    id,
    nome: id,
    inicio: '0m',
    duracao: '4m',
    ...extra
  });

  beforeEach(() => {
    vi.clearAllMocks();
    toneMocks.context.state = 'running';
    toneMocks.context.currentTime = 12;
    toneMocks.context.lookAhead = 0;
    toneMocks.transport.seconds = 12;
    toneMocks.transport.timeSignature = 4;
    toneMocks.transport.position = 0;
    toneMocks.transport.getSecondsAtTime.mockImplementation((time: number) => time);
    toneMocks.time.mockImplementation((value: string | number) => ({ toSeconds: () => Number.parseFloat(String(value)) || 0 }));
    toneMocks.immediate.mockReturnValue(12);
    toneMocks.start.mockResolvedValue(undefined);
    toneMocks.loaded.mockResolvedValue(undefined);
    toneMocks.transport.scheduleOnce.mockReturnValue(42);
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    vi.stubGlobal('alert', vi.fn());

    fileRepository = {
      getFileUrl: vi.fn(async (_directory: string, name: string) => ({ url: `blob:${name}`, fromCache: true }))
    };
    hookService = {
      dispararCorrespondentes: vi.fn(),
      dispararEventosPadrao: vi.fn(),
      registrarEventos: vi.fn(),
      registrarIntegracoes: vi.fn()
    };
    latencySettings = {
      activeConfig: signal({ lookaheadMs: 250, offsetMs: 0 })
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: FileRepositoryService, useValue: fileRepository },
        { provide: HookHandlerService, useValue: hookService },
        { provide: LatencySettingsService, useValue: latencySettings }
      ]
    });
    service = TestBed.inject(AudioEngineService);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    TestBed.resetTestingModule();
  });

  const projectJson = (overrides: Record<string, unknown> = {}) => JSON.stringify({
    nomeProjeto: 'Projeto de teste',
    bpm: 100,
    timeSignature: 4,
    pastaBase: 'base',
    canais: [{ id: 'track-1', nome: 'Pista 1', arquivo: 'track.mp3' }],
    ...overrides
  });

  it('creates the service and applies the configured audio lookahead', () => {
    TestBed.flushEffects();

    expect(service).toBeTruthy();
    expect(Tone.getContext().lookAhead).toBe(0.25);
  });

  it('initializes Tone once and applies the current BPM', async () => {
    service.bpmAtual.set(96);

    await service.init();
    await service.init();

    expect(toneMocks.start).toHaveBeenCalledTimes(1);
    expect(toneMocks.transport.bpm.value).toBe(96);
    expect(service.isReady()).toBe(true);
  });

  it('computes remaining plays and the active segment position', () => {
    service.trechoAtivo.set(marker('intro', { inicio: '2m', loopStart: '4m', duracao: '8m', maxPlays: '3' }));
    service.loopCount.set(1);
    service.segundosDecorridosNoBloco.set(4.8);

    expect(service.loopsRestantes()).toBe(2);
    expect(service.totalCompassosTrecho()).toBe(8);
    expect(service.compassoDecorritoNoTrecho()).toBe(3);

    service.loopCount.set(3);
    expect(service.loopsRestantes()).toBe(0);
  });

  it('returns null remaining plays for an unbounded or invalid maximum', () => {
    service.trechoAtivo.set(marker('loop'));
    expect(service.loopsRestantes()).toBeNull();

    service.trechoAtivo.set(marker('invalid', { maxPlays: '0' }));
    expect(service.loopsRestantes()).toBeNull();
  });

  it('loads project tracks in parallel and preserves their configured order', async () => {
    let activeRequests = 0;
    let maximumConcurrentRequests = 0;
    fileRepository.getFileUrl.mockImplementation(async (_directory: string, name: string) => {
      activeRequests += 1;
      maximumConcurrentRequests = Math.max(maximumConcurrentRequests, activeRequests);
      await Promise.resolve();
      activeRequests -= 1;
      return { url: `blob:${name}`, fromCache: true };
    });
    const config = JSON.parse(projectJson({ canais: [
      { id: 'first', nome: 'Primeira', arquivo: 'first.mp3' },
      { id: 'second', nome: 'Segunda', arquivo: 'second.mp3', muted: true, volume: -6 }
    ] })) as { canais: Array<{ id: string }> };

    const loaded = await service.carregarProjetoPorJSON(JSON.stringify(config));

    expect(loaded).toBe(true);
    expect(maximumConcurrentRequests).toBe(2);
    expect(service.canais().map(channel => channel.id)).toEqual(['first', 'second']);
    expect(service.canais()[1].isMuted()).toBe(true);
    expect(service.canais()[1].volumeSignal()).toBe(-6);
    expect(service.bpmAtual()).toBe(100);
    expect(service.timeSignature()).toBe(4);
    expect(service.isFullyLoaded()).toBe(true);
  });

  it('resolves marker references and optionally appends the full-song marker', async () => {
    const original = marker('original', { inicio: '2m', duracao: '8m', nextMarker: 'next' });
    const alias = marker('alias', { nome: 'Alias', referencia: 'original', nextMarker: 'later' });
    await service.carregarProjetoPorJSON(projectJson({ markers: [original, alias], fullSong: true }));

    expect(service.markers()).toHaveLength(3);
    expect(service.markers()[1]).toMatchObject({ id: 'alias', nome: 'Alias', inicio: '2m', duracao: '8m', nextMarker: 'later' });
    expect(service.markers()[2]).toMatchObject({ id: 'full-audio', inicio: '0m', duracao: '8' });
  });

  it('creates a full-song marker when project markers are missing', async () => {
    await service.carregarProjetoPorJSON(projectJson({ canais: [
      { id: 'short', nome: 'Curta', arquivo: 'short.mp3' },
      { id: 'long', nome: 'Longa', arquivo: 'long.mp3' }
    ] }));

    expect(service.markers()).toEqual([expect.objectContaining({ id: 'full-audio', duracao: '14' })]);
  });

  it('returns false and sets an error status when project JSON is invalid', async () => {
    const loaded = await service.carregarProjetoPorJSON('{invalid json');

    expect(loaded).toBe(false);
    expect(service.isFullyLoaded()).toBe(false);
    expect(service.statusCarregamento()).toBe('Erro ao carregar projeto.');
    expect(alert).toHaveBeenCalled();
  });

  it('rejects marker references that do not exist in the project', async () => {
    const loaded = await service.carregarProjetoPorJSON(projectJson({
      markers: [marker('alias', { referencia: 'missing' })]
    }));

    expect(loaded).toBe(false);
    expect(service.statusCarregamento()).toBe('Erro ao carregar projeto.');
    expect(alert).toHaveBeenCalledOnce();
  });

  it('selects a marker immediately while stopped and as the next marker while playing', () => {
    const selected = marker('verse');
    service.markers.set([selected]);

    service.agendarTrecho('verse');
    expect(service.trechoAtivo()).toBe(selected);

    service.isPlaying.set(true);
    service.agendarTrecho('verse');
    expect(service.proximoTrecho()).toBe(selected);

    service.agendarTrecho('missing');
    expect(service.proximoTrecho()).toBe(selected);
    service.agendarTrecho('');
    expect(service.proximoTrecho()).toBeNull();
  });

  it('updates volume, solo, mute and physical output on the channel', () => {
    const channel = createChannel();

    service.alterarVolume(channel, -12);
    service.alternarSolo(channel);
    service.alternarMute(channel);
    service.alterarSaidaFisica(channel, 1);

    expect(channel.volumeSignal()).toBe(-12);
    expect(channel.volumeNode.volume.rampTo).toHaveBeenCalledWith(-12, 0.05);
    expect(channel.isSoloed()).toBe(true);
    expect(channel.channelNode.solo).toBe(true);
    expect(channel.isMuted()).toBe(true);
    expect(channel.channelNode.mute).toBe(true);
    expect(channel.saidaAtiva()).toBe('Saída 2');
    expect(channel.channelNode.disconnect).toHaveBeenCalledOnce();
    expect(channel.channelNode.connect).toHaveBeenCalledWith(Tone.Destination, 0, 1);
  });

  it('reports progress only while playing', () => {
    expect(service.obterProgressoEmSegundos()).toBe(0);
    service.isPlaying.set(true);
    service['tempoInicioCicloTransport'] = 9;
    toneMocks.transport.seconds = 13;

    expect(service.obterProgressoEmSegundos()).toBe(4);
  });

  it('starts playback and schedules the active marker', async () => {
    await service.carregarProjetoPorJSON(projectJson({ markers: [marker('verse', { duracao: '4' })] }));

    await service.togglePlay();

    expect(toneMocks.transport.start).toHaveBeenCalledOnce();
    expect(service.isPlaying()).toBe(true);
    expect(toneMocks.transport.scheduleOnce).toHaveBeenCalledOnce();
    expect(service.canais()[0].player.start).toHaveBeenCalledWith(12, 0, 4);
  });

  it('does not start playback when no tracks are loaded', async () => {
    await service.togglePlay();

    expect(alert).toHaveBeenCalledWith('Carregue um arquivo JSON de projeto primeiro!');
    expect(toneMocks.transport.start).not.toHaveBeenCalled();
  });

  it('stops playback, clears scheduled transport work and resets UI state', async () => {
    await service.carregarProjetoPorJSON(projectJson());
    await service.togglePlay();
    service.loopCount.set(2);
    service.proximoTrecho.set(marker('next'));

    await service.togglePlay();

    expect(toneMocks.transport.stop).toHaveBeenCalled();
    expect(toneMocks.transport.cancel).toHaveBeenCalledWith(0);
    expect(toneMocks.transport.clear).toHaveBeenCalledWith(42);
    expect(service.canais()[0].player.stop).toHaveBeenCalled();
    expect(service.isPlaying()).toBe(false);
    expect(service.loopCount()).toBe(0);
    expect(service.proximoTrecho()).toBeNull();
    expect(hookService.dispararEventosPadrao).toHaveBeenCalledOnce();
  });

  it('starts a selected marker at the next measure and resets transition state', () => {
    const selected = marker('chorus', { duracao: '4' });
    service.markers.set([selected]);
    service.isPlaying.set(true);
    service.bpmAtual.set(120);
    service['tempoInicioCicloTransport'] = 10;
    toneMocks.transport.seconds = 11;

    service.dispararTrechoNoProximoCompasso('chorus');
    const callback = toneMocks.transport.scheduleOnce.mock.calls.at(-1)?.[0] as (time: number) => void;
    callback(14);

    expect(toneMocks.transport.scheduleOnce).toHaveBeenNthCalledWith(1, expect.any(Function), 12);
    expect(service.trechoAtivo()).toBe(selected);
    expect(service.proximoTrechoImediato()).toBeNull();
  });

  it('starts playback immediately when a measure-triggered marker is selected while stopped', async () => {
    const selected = marker('chorus', { duracao: '4' });
    await service.carregarProjetoPorJSON(projectJson({ markers: [selected] }));

    service.dispararTrechoNoProximoCompasso('chorus');
    await Promise.resolve();

    expect(service.trechoAtivo()).toMatchObject({ id: 'chorus' });
    expect(service.isPlaying()).toBe(true);
    expect(toneMocks.transport.start).toHaveBeenCalledOnce();
  });

  it('updates the displayed time and dispatches hooks only when the beat changes', () => {
    let frameCallback: FrameRequestCallback | undefined;
    vi.mocked(requestAnimationFrame).mockImplementation(callback => {
      frameCallback = callback;
      return 1;
    });
    service.isPlaying.set(true);
    service.bpmAtual.set(120);
    service.trechoAtivo.set(marker('verse', { inicio: '0m' }));
    const elapsedTimeSet = vi.spyOn(service.segundosDecorridosNoBloco, 'set');
    service['iniciarRelogioUI']();

    toneMocks.transport.seconds = 0.1;
    frameCallback?.(0);
    toneMocks.transport.seconds = 0.2;
    frameCallback?.(16);
    expect(elapsedTimeSet).toHaveBeenCalledTimes(1);
    expect(hookService.dispararCorrespondentes).toHaveBeenCalledTimes(1);

    toneMocks.transport.seconds = 0.6;
    frameCallback?.(32);
    expect(elapsedTimeSet).toHaveBeenCalledTimes(2);
    expect(service.beatAtualNoBloco()).toBe(2);
    expect(hookService.dispararCorrespondentes).toHaveBeenCalledTimes(1);
  });

  it('starts an existing marker immediately and resets the loop count', () => {
    const selected = marker('bridge', { duracao: '4' });
    const channel = createChannel();
    service.markers.set([selected]);
    service.canais.set([channel]);
    service.loopCount.set(3);

    service.dispararTrechoInstantaneamente('bridge');

    expect(channel.player.stop).toHaveBeenCalledWith(12);
    expect(service.trechoAtivo()).toBe(selected);
    expect(service.loopCount()).toBe(0);
    expect(channel.player.start).toHaveBeenCalledWith(12, 0, 4);
  });

  it('disposes previous audio channels and revokes blob URLs when reloading', async () => {
    await service.carregarProjetoPorJSON(projectJson());
    const previousChannel = service.canais()[0];
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);

    await service.carregarProjetoPorJSON(projectJson({ canais: [] }));

    expect(previousChannel.player.dispose).toHaveBeenCalledOnce();
    expect(previousChannel.volumeNode.dispose).toHaveBeenCalledOnce();
    expect(previousChannel.channelNode.dispose).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:track.mp3');
    expect(service.canais()).toEqual([]);
  });

  function createChannel(): CanalAudio {
    return {
      id: 'test-channel',
      nome: 'Teste',
      arquivo: 'test.mp3',
      player: {
        loaded: true,
        buffer: { duration: 4, url: '' },
        stop: vi.fn(),
        start: vi.fn(),
        dispose: vi.fn()
      } as unknown as Tone.Player,
      volumeNode: { volume: { rampTo: vi.fn() }, dispose: vi.fn() } as unknown as Tone.Volume,
      channelNode: {
        mute: false,
        solo: false,
        disconnect: vi.fn(),
        connect: vi.fn(),
        dispose: vi.fn()
      } as unknown as Tone.Channel,
      volumeSignal: signal(0),
      isMuted: signal(false),
      isSoloed: signal(false),
      saidaAtiva: signal('Master')
    };
  }
});
