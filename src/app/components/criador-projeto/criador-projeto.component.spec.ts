import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { FileRepositoryService } from '../../services/file-repository.service';
import { BundleProjectService } from '../../services/bundle-project.service';
import { NotificacaoService } from '../../services/notificacao.service';

import { CriadorProjetoComponent } from './criador-projeto.component';

const toneTransport = vi.hoisted(() => ({
  bpm: { value: 120 },
  timeSignature: 4,
  seconds: 0,
  scheduleRepeat: vi.fn(),
  scheduleOnce: vi.fn(() => 1),
  clear: vi.fn(),
  start: vi.fn(),
  pause: vi.fn(),
  stop: vi.fn(),
  cancel: vi.fn(),
}));

const tonePlayer = vi.hoisted(() => vi.fn(function () {
  return {
    start: vi.fn(),
    stop: vi.fn(),
    dispose: vi.fn(),
    toDestination: vi.fn(function (this: unknown) { return this; }),
  };
}));
const toneTime = vi.hoisted(() => vi.fn((position: string | number) => ({
  toSeconds: () => typeof position === 'number' ? position : Number.parseFloat(position) * 2,
  quantize: () => 0,
})));

vi.mock('tone', () => ({
  Transport: toneTransport,
  Player: tonePlayer,
  Time: toneTime,
  start: vi.fn().mockResolvedValue(undefined),
  loaded: vi.fn().mockResolvedValue(undefined),
}));

describe('CriadorProjetoComponent', () => {
  let component: CriadorProjetoComponent;
  let fixture: ComponentFixture<CriadorProjetoComponent>;
  const fileRepository = {
    getDirectories: vi.fn().mockResolvedValue([]),
    getFiles: vi.fn().mockResolvedValue([]),
    getFileUrl: vi.fn(),
    saveProject: vi.fn(async (config: { nomeProjeto: string }) => ({ id: 1, config })),
  };
  const bundleService = { importarEInstalarZip: vi.fn() };
  const notificacao = { sucesso: vi.fn(), erro: vi.fn() };

  beforeEach(async () => {
    vi.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [CriadorProjetoComponent],
      providers: [
        { provide: FileRepositoryService, useValue: fileRepository },
        { provide: BundleProjectService, useValue: bundleService },
        { provide: NotificacaoService, useValue: notificacao },
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CriadorProjetoComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Criar/Editar Projeto');
  });

  it('plays a synchronized mix of unmuted channels with their configured volume', async () => {
    fileRepository.getFileUrl.mockResolvedValue({ url: 'blob:audio', fromCache: true });
    component.pastaBase.set('ensaio');
    component.canais.set([
      { id: 'click', nome: 'Click', arquivo: 'click.wav', volume: -6 },
      { id: 'voz', nome: 'Voz', arquivo: 'voz.wav', muted: true, volume: 0 },
      { id: 'baixo', nome: 'Baixo', arquivo: '', volume: 0 },
    ]);

    await component.togglePlay();

    expect(fileRepository.getFileUrl).toHaveBeenCalledTimes(1);
    expect(fileRepository.getFileUrl).toHaveBeenCalledWith('ensaio', 'click.wav');
    expect(tonePlayer).toHaveBeenCalledWith({ url: 'blob:audio', autostart: false, volume: -6 });
    expect(tonePlayer.mock.results[0].value.start).toHaveBeenCalledWith(undefined, 0, undefined);
    expect(component.isPlaying()).toBe(true);
  });

  it('previews the referenced marker from its configured start for its configured duration', async () => {
    fileRepository.getFileUrl.mockResolvedValue({ url: 'blob:audio', fromCache: true });
    component.pastaBase.set('ensaio');
    component.offset.set(250);
    component.canais.set([{ id: 'click', nome: 'Click', arquivo: 'click.wav', volume: 0 }]);
    component.trechosForm.set([
      { nome: 'Intro', compassoInicio: 8, compassosDuracao: 2, maxPlays: 0, nextMarker: '', referencia: '', modoDisparo: 'bloco' },
      { nome: 'Intro curta', compassoInicio: 0, compassosDuracao: 1, maxPlays: 0, nextMarker: '', referencia: 'intro', modoDisparo: 'bloco' },
    ]);
    toneTransport.seconds = 0;

    await component.reproduzirTrecho(1);

    expect(tonePlayer.mock.results[0].value.start).toHaveBeenCalledWith(undefined, 16.25, 4);
    expect(toneTransport.scheduleOnce).toHaveBeenCalledWith(expect.any(Function), 20);
    expect(component.isPlaying()).toBe(true);
  });

  it('moves a marker up or down by one position and ignores list boundaries', () => {
    component.trechosForm.set([
      { nome: 'Intro', compassoInicio: 0, compassosDuracao: 4, maxPlays: 0, nextMarker: '', referencia: '', modoDisparo: 'bloco' },
      { nome: 'Verso', compassoInicio: 4, compassosDuracao: 8, maxPlays: 0, nextMarker: '', referencia: '', modoDisparo: 'bloco' },
      { nome: 'Refrão', compassoInicio: 12, compassosDuracao: 8, maxPlays: 0, nextMarker: '', referencia: '', modoDisparo: 'bloco' },
    ]);

    component.moverTrecho(1, -1);
    expect(component.trechosForm().map(trecho => trecho.nome)).toEqual(['Verso', 'Intro', 'Refrão']);

    component.moverTrecho(0, -1);
    expect(component.trechosForm().map(trecho => trecho.nome)).toEqual(['Verso', 'Intro', 'Refrão']);

    component.moverTrecho(1, 1);
    expect(component.trechosForm().map(trecho => trecho.nome)).toEqual(['Verso', 'Refrão', 'Intro']);

    component.moverTrecho(2, 1);
    expect(component.trechosForm().map(trecho => trecho.nome)).toEqual(['Verso', 'Refrão', 'Intro']);
  });

  it('scrolls the moved marker into view after the list updates', () => {
    component.trechosForm.set([
      { nome: 'Intro', compassoInicio: 0, compassosDuracao: 4, maxPlays: 0, nextMarker: '', referencia: '', modoDisparo: 'bloco' },
      { nome: 'Verso', compassoInicio: 4, compassosDuracao: 8, maxPlays: 0, nextMarker: '', referencia: '', modoDisparo: 'bloco' },
    ]);
    const itemMovido = document.createElement('div');
    itemMovido.className = 'item-trecho';
    const botao = document.createElement('button');
    itemMovido.append(botao);
    const scrollIntoView = vi.fn();
    Object.defineProperty(itemMovido, 'scrollIntoView', { value: scrollIntoView });
    document.body.append(itemMovido);
    const requestFrame = vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => {
      callback(0);
      return 1;
    });

    component.moverTrecho(1, -1, { currentTarget: botao } as unknown as Event);

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'nearest' });
    itemMovido.remove();
    requestFrame.mockRestore();
  });

  it('duplicates a marker directly below it with the same settings and a unique name', () => {
    component.trechosForm.set([
      { nome: 'Refrão', compassoInicio: 8, compassosDuracao: 4, maxPlays: 2, nextMarker: 'final', referencia: '', modoDisparo: 'bloco' },
      { nome: 'Final', compassoInicio: 12, compassosDuracao: 4, maxPlays: 0, nextMarker: '', referencia: '', modoDisparo: 'compasso' },
    ]);

    component.duplicarTrecho(0);

    expect(component.trechosForm()).toEqual([
      { nome: 'Refrão', compassoInicio: 8, compassosDuracao: 4, maxPlays: 2, nextMarker: 'final', referencia: '', modoDisparo: 'bloco' },
      { nome: 'Refrão - cópia', compassoInicio: 8, compassosDuracao: 4, maxPlays: 2, nextMarker: 'final', referencia: '', modoDisparo: 'bloco' },
      { nome: 'Final', compassoInicio: 12, compassosDuracao: 4, maxPlays: 0, nextMarker: '', referencia: '', modoDisparo: 'compasso' },
    ]);
  });

  it('generates another unique marker name when duplicating the same marker repeatedly', () => {
    component.trechosForm.set([
      { nome: 'Verso', compassoInicio: 0, compassosDuracao: 8, maxPlays: 0, nextMarker: '', referencia: '', modoDisparo: 'bloco' },
    ]);

    component.duplicarTrecho(0);
    component.duplicarTrecho(0);

    expect(component.trechosForm().map(trecho => trecho.nome)).toEqual([
      'Verso',
      'Verso - cópia 2',
      'Verso - cópia',
    ]);
  });

  it('saves an imported JSON project locally without downloading it', async () => {
    const config = {
      bpm: 96,
      timeSignature: 4,
      pastaBase: 'ensaio',
      canais: [{ id: 'click', nome: 'Click', arquivo: 'click.wav' }],
    };
    class FileReaderMock {
      onload: ((event: ProgressEvent<FileReader>) => void) | null = null;

      readAsText() {
        this.onload?.({ target: { result: JSON.stringify(config) } } as ProgressEvent<FileReader>);
      }
    }
    vi.stubGlobal('FileReader', FileReaderMock);
    vi.stubGlobal('alert', vi.fn());
    const downloadSpy = vi.spyOn(component, 'baixarJsonProjeto');
    const arquivo = new File(['{}'], 'ensaio.json', { type: 'application/json' });
    const evento = { target: { files: [arquivo], value: 'ensaio.json' } } as unknown as Event;

    component.importarJsonProjeto(evento);

    await vi.waitFor(() => expect(fileRepository.saveProject).toHaveBeenCalled());
    expect(fileRepository.saveProject).toHaveBeenCalledWith(expect.objectContaining({
      nomeProjeto: 'ensaio',
      bpm: 96,
      pastaBase: 'ensaio',
    }));
    expect(component.statusImportacao()).toBe('Projeto carregado e salvo no banco local.');
    expect(notificacao.sucesso).toHaveBeenCalledWith('Projeto "ensaio" importado e salvo.');
    expect(downloadSpy).not.toHaveBeenCalled();
  });

  it('saves the current project without starting a download', async () => {
    const downloadSpy = vi.spyOn(component, 'baixarJsonProjeto');

    await component.salvarProjeto();

    expect(fileRepository.saveProject).toHaveBeenCalledWith(expect.objectContaining({
      nomeProjeto: 'Sem Nome',
      bpm: 120,
    }), undefined);
    expect(component.statusImportacao()).toBe('Projeto salvo no banco local.');
    expect(notificacao.sucesso).toHaveBeenCalledWith('Projeto "Sem Nome" salvo no banco local.');
    expect(downloadSpy).not.toHaveBeenCalled();
  });

  it('checks and downloads a channel audio only when requested', async () => {
    fileRepository.getFileUrl.mockResolvedValue({ url: 'blob:audio', fromCache: true });
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    component.pastaBase.set('ensaio');
    const canal = { id: 'click', nome: 'Click', arquivo: 'click.wav' };

    expect(fileRepository.getFileUrl).not.toHaveBeenCalled();
    await component.baixarAudioCanal(canal);

    expect(fileRepository.getFileUrl).toHaveBeenCalledWith('ensaio', 'click.wav');
    expect(clickSpy).toHaveBeenCalledOnce();
    expect(component.statusImportacao()).toBe('Download iniciado: click.wav');
  });

  it('reports a missing channel audio when the download returns 404', async () => {
    fileRepository.getFileUrl.mockRejectedValue({ status: 404 });
    component.pastaBase.set('ensaio');

    await component.baixarAudioCanal({ id: 'click', nome: 'Click', arquivo: 'missing.wav' });

    expect(component.statusImportacao()).toBe('Arquivo de áudio "missing.wav" não encontrado na pasta "ensaio".');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    TestBed.resetTestingModule();
  });
});
