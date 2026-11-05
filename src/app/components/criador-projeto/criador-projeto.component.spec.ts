import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { FileRepositoryService } from '../../services/file-repository.service';
import { BundleProjectService } from '../../services/bundle-project.service';

import { CriadorProjetoComponent } from './criador-projeto.component';

const toneTransport = vi.hoisted(() => ({
  bpm: { value: 120 },
  timeSignature: 4,
  scheduleRepeat: vi.fn(),
  stop: vi.fn(),
  cancel: vi.fn(),
}));

vi.mock('tone', () => ({ Transport: toneTransport }));

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

  beforeEach(async () => {
    vi.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [CriadorProjetoComponent],
      providers: [
        { provide: FileRepositoryService, useValue: fileRepository },
        { provide: BundleProjectService, useValue: bundleService },
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
    expect(fixture.nativeElement.textContent).toContain('Salvar Projeto');
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
