import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { vi } from 'vitest';
import { FileRepositoryService } from '../../services/file-repository.service';
import { BundleProjectService } from '../../services/bundle-project.service';

import { SelecionarProjetoDialogComponent } from './selecionar-projeto-dialog.component';

describe('SelecionarProjetoDialogComponent', () => {
  let component: SelecionarProjetoDialogComponent;
  let fixture: ComponentFixture<SelecionarProjetoDialogComponent>;
  const fileRepo = {
    getProjects: vi.fn().mockResolvedValue([]),
    duplicateProject: vi.fn(),
    deleteProject: vi.fn(),
  };
  const bundleService = { exportarParaZip: vi.fn().mockResolvedValue(undefined) };
  const dialogRef = { close: vi.fn() };
  const dialogData: { origem: 'mixer' | 'criador' } = { origem: 'mixer' };

  beforeEach(async () => {
    vi.clearAllMocks();
    dialogData.origem = 'mixer';
    await TestBed.configureTestingModule({
      imports: [SelecionarProjetoDialogComponent],
      providers: [
        { provide: FileRepositoryService, useValue: fileRepo },
        { provide: BundleProjectService, useValue: bundleService },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: dialogData },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SelecionarProjetoDialogComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('exports a saved project through the ZIP bundle service', async () => {
    const projeto = {
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

    await component.baixarProjeto(projeto);

    expect(bundleService.exportarParaZip).toHaveBeenCalledWith(projeto.config, ['click.wav']);
  });

  it('offers only live loading when opened from the mixer', async () => {
    const project = {
      id: 1,
      nomeProjeto: 'Ensaio',
      pastaBase: 'ensaio',
      config: { nomeProjeto: 'Ensaio', bpm: 100, canais: [] },
    } as any;
    fileRepo.getProjects.mockResolvedValue([project]);
    await component.carregarLista();
    fixture.detectChanges();

    expect(component.origem).toBe('mixer');
    expect(fixture.nativeElement.querySelector('.btn-editar')).toBeNull();
    expect(fixture.nativeElement.querySelector('.btn-download')).toBeNull();
    expect(fixture.nativeElement.querySelector('.btn-duplicar')).toBeNull();
    expect(fixture.nativeElement.querySelector('.btn-deletar')).toBeNull();
    expect(fixture.nativeElement.querySelector('.btn-carregar')).not.toBeNull();
  });

  it('returns an explicit load action', () => {
    const project = {
      id: 2,
      nomeProjeto: 'Ao vivo',
      pastaBase: 'ao-vivo',
      config: { nomeProjeto: 'Ao vivo', bpm: 100 },
    } as any;

    component.selecionar(project);

    expect(dialogRef.close).toHaveBeenCalledWith({ acao: 'carregar', config: project.config });
  });

  it('shows duplication only when opened from the creator', async () => {
    const project = {
      id: 1,
      nomeProjeto: 'Ensaio',
      pastaBase: 'ensaio',
      config: { nomeProjeto: 'Ensaio', bpm: 100, canais: [] },
    } as any;
    dialogData.origem = 'criador';
    fileRepo.getProjects.mockResolvedValue([project]);
    fixture.destroy();
    fixture = TestBed.createComponent(SelecionarProjetoDialogComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.btn-duplicar')).not.toBeNull();
  });

  it('opens the duplicated project in edit mode', async () => {
    const original = {
      id: 1,
      nomeProjeto: 'Ensaio',
      pastaBase: 'ensaio',
      config: { nomeProjeto: 'Ensaio', bpm: 100, canais: [] },
    } as any;
    const copy = { ...original, id: 2, nomeProjeto: 'Ensaio cópia' };
    fileRepo.duplicateProject.mockResolvedValue(copy);

    await component.duplicar(original);

    expect(fileRepo.duplicateProject).toHaveBeenCalledWith(original);
    expect(dialogRef.close).toHaveBeenCalledWith({ acao: 'editar', projeto: copy });
  });
});
