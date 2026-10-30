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
    saveProject: vi.fn().mockResolvedValue(1),
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

  afterEach(() => {
    vi.unstubAllGlobals();
    TestBed.resetTestingModule();
  });
});
