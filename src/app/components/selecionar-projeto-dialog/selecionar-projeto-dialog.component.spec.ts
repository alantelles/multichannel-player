import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { vi } from 'vitest';
import { FileRepositoryService } from '../../services/file-repository.service';
import { BundleProjectService } from '../../services/bundle-project.service';

import { SelecionarProjetoDialogComponent } from './selecionar-projeto-dialog.component';

describe('SelecionarProjetoDialogComponent', () => {
  let component: SelecionarProjetoDialogComponent;
  let fixture: ComponentFixture<SelecionarProjetoDialogComponent>;
  const fileRepo = { getProjects: vi.fn().mockResolvedValue([]), deleteProject: vi.fn() };
  const bundleService = { exportarParaZip: vi.fn().mockResolvedValue(undefined) };
  const dialogRef = { close: vi.fn() };

  beforeEach(async () => {
    vi.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [SelecionarProjetoDialogComponent],
      providers: [
        { provide: FileRepositoryService, useValue: fileRepo },
        { provide: BundleProjectService, useValue: bundleService },
        { provide: MatDialogRef, useValue: dialogRef },
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
});
