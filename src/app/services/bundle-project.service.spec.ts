import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { FileRepositoryService } from './file-repository.service';

import { BundleProjectService } from './bundle-project.service';

const zipMockState = vi.hoisted(() => ({ files: {} as Record<string, unknown> }));
const saveAsMock = vi.hoisted(() => vi.fn());

vi.mock('jszip', () => ({
  default: class {
    async loadAsync() {
      return { files: zipMockState.files };
    }
  },
}));

vi.mock('file-saver', () => ({ saveAs: saveAsMock }));

describe('ExportProjectService', () => {
  let service: BundleProjectService;
  const fileRepository = {
    saveFile: vi.fn().mockResolvedValue(undefined),
    saveProject: vi.fn().mockResolvedValue(1),
    getFiles: vi.fn().mockResolvedValue([]),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [{ provide: FileRepositoryService, useValue: fileRepository }],
    });
    service = TestBed.inject(BundleProjectService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('saves an imported ZIP project locally instead of downloading its modified JSON', async () => {
    const config = {
      nomeProjeto: 'Ensaio',
      pastaBase: 'ensaio',
      bpm: 93,
      timeSignature: 4,
      canais: [{ id: 'drums', nome: 'Bateria', arquivo: 'drums.wav' }],
    };
    zipMockState.files = {
      'ensaio.json': { async: async () => JSON.stringify(config) },
      'audios/drums.wav': { dir: false, async: async () => new Blob(['audio'], { type: 'audio/wav' }) },
    };
    const status = signal('');
    vi.useFakeTimers();

    await service.importarEInstalarZip(new File(['zip'], 'ensaio.zip'), status);

    const configSalva = fileRepository.saveProject.mock.calls[0][0];
    expect(configSalva).toMatchObject({ ...config, pastaBase: expect.stringMatching(/^ensaio-\d{12}$/) });
    expect(fileRepository.saveFile).toHaveBeenCalledWith(configSalva.pastaBase, 'drums.wav', expect.any(File));
    expect(saveAsMock).not.toHaveBeenCalled();
    expect(status()).toBe('Projeto importado e salvo no banco local!');
    vi.useRealTimers();
  });
});
