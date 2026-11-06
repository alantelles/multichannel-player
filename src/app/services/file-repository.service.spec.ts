import { TestBed } from '@angular/core/testing';
import { DbService, SavedProject } from './db.service';

import { FileRepositoryService } from './file-repository.service';

describe('FileRepositoryService', () => {
  let service: FileRepositoryService;
  let savedProjects: SavedProject[];
  const projectTable = {
    toArray: vi.fn(async () => savedProjects),
    get: vi.fn(async (id: number) => savedProjects.find(project => project.id === id)),
    add: vi.fn(async (project: SavedProject) => {
      const id = savedProjects.length + 1;
      savedProjects.push({ ...project, id });
      return id;
    }),
    put: vi.fn(async (project: SavedProject) => {
      const index = savedProjects.findIndex(saved => saved.id === project.id);
      if (index >= 0) savedProjects[index] = project;
      else savedProjects.push(project);
      return project.id ?? savedProjects.length;
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

    expect([first.config.nomeProjeto, second.config.nomeProjeto, third.config.nomeProjeto]).toEqual([
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

    expect(saved.config.nomeProjeto).toBe('Ensaio v3');
  });

  it('updates the selected project record when an existing ID is supplied', async () => {
    savedProjects.push({
      id: 7,
      nomeProjeto: 'Ensaio',
      pastaBase: 'ensaio',
      favorito: true,
      config: { nomeProjeto: 'Ensaio', pastaBase: 'ensaio', bpm: 96, timeSignature: 4, canais: [] },
    });

    const saved = await service.saveProject({
      nomeProjeto: 'Ensaio',
      pastaBase: 'ensaio-editado',
      bpm: 110,
      timeSignature: 4,
      canais: [],
    }, 7);

    expect(saved).toMatchObject({ id: 7, config: { nomeProjeto: 'Ensaio', bpm: 110 } });
    expect(savedProjects).toHaveLength(1);
    expect(savedProjects[0].favorito).toBe(true);
    expect(projectTable.put).toHaveBeenCalled();
  });

  it('toggles a project favorite and lists favorites before other projects', async () => {
    savedProjects.push(
      { id: 1, nomeProjeto: 'Zebra', pastaBase: '', config: { nomeProjeto: 'Zebra', pastaBase: '', bpm: 96, timeSignature: 4, canais: [] } },
      { id: 2, nomeProjeto: 'Alfa', pastaBase: '', favorito: true, config: { nomeProjeto: 'Alfa', pastaBase: '', bpm: 96, timeSignature: 4, canais: [] } },
      { id: 3, nomeProjeto: 'Beta', pastaBase: '', config: { nomeProjeto: 'Beta', pastaBase: '', bpm: 96, timeSignature: 4, canais: [] } },
    );

    await service.toggleProjectFavorite(3);

    expect(savedProjects.find(project => project.id === 3)?.favorito).toBe(true);
    expect((await service.getProjects()).map(project => project.nomeProjeto)).toEqual(['Alfa', 'Beta', 'Zebra']);

    await service.toggleProjectFavorite(2);

    expect(savedProjects.find(project => project.id === 2)?.favorito).toBe(false);
    expect((await service.getProjects()).map(project => project.nomeProjeto)).toEqual(['Beta', 'Alfa', 'Zebra']);
  });

  it('duplicates project settings and keeps the original audio folder', async () => {
    const original: SavedProject = {
      id: 1,
      nomeProjeto: 'Ensaio',
      pastaBase: 'ensaio',
      config: {
        nomeProjeto: 'Ensaio',
        pastaBase: 'ensaio',
        bpm: 96,
        timeSignature: 4,
        canais: [{ id: 'click', nome: 'Click', arquivo: 'click.wav' }],
      },
    };
    savedProjects.push(original);

    const copy = await service.duplicateProject(original);

    expect(copy).toMatchObject({
      nomeProjeto: 'Ensaio cópia',
      pastaBase: 'ensaio',
      config: { bpm: 96, pastaBase: 'ensaio' },
    });
    expect(savedProjects[1].config.canais).toEqual(original.config.canais);
    expect(savedProjects).toHaveLength(2);
  });
});
