import { TestBed } from '@angular/core/testing';
import { DbService, SavedProject } from './db.service';

import { FileRepositoryService } from './file-repository.service';

describe('FileRepositoryService', () => {
  let service: FileRepositoryService;
  let savedProjects: SavedProject[];
  const projectTable = {
    toArray: vi.fn(async () => savedProjects),
    add: vi.fn(async (project: SavedProject) => {
      savedProjects.push(project);
      return savedProjects.length;
    }),
  };
  const database = {
    projects: projectTable,
    transaction: vi.fn(async (_mode: string, _table: unknown, callback: () => Promise<unknown>) => callback()),
  };

  beforeEach(() => {
    savedProjects = [];
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [{ provide: DbService, useValue: database }],
    });
    service = TestBed.inject(FileRepositoryService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('creates incrementing versions instead of overwriting projects with the same name', async () => {
    const config = {
      nomeProjeto: 'Ensaio',
      pastaBase: 'ensaio',
      bpm: 96,
      timeSignature: 4,
      canais: [],
    };

    const first = await service.saveProject(config);
    const second = await service.saveProject(config);
    const third = await service.saveProject(config);

    expect([first.nomeProjeto, second.nomeProjeto, third.nomeProjeto]).toEqual([
      'Ensaio',
      'Ensaio v2',
      'Ensaio v3',
    ]);
    expect(savedProjects.map(project => project.config.nomeProjeto)).toEqual([
      'Ensaio',
      'Ensaio v2',
      'Ensaio v3',
    ]);
  });

  it('continues from an existing version suffix', async () => {
    savedProjects.push({
      nomeProjeto: 'Ensaio',
      pastaBase: 'ensaio',
      config: { nomeProjeto: 'Ensaio', pastaBase: 'ensaio', bpm: 96, timeSignature: 4, canais: [] },
    });
    savedProjects.push({
      nomeProjeto: 'Ensaio v2',
      pastaBase: 'ensaio',
      config: { nomeProjeto: 'Ensaio v2', pastaBase: 'ensaio', bpm: 96, timeSignature: 4, canais: [] },
    });

    const saved = await service.saveProject({
      nomeProjeto: 'Ensaio v2',
      pastaBase: 'ensaio',
      bpm: 96,
      timeSignature: 4,
      canais: [],
    });

    expect(saved.nomeProjeto).toBe('Ensaio v3');
  });
});
