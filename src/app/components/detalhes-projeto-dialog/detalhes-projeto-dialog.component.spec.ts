import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { vi } from 'vitest';
import { SavedProject } from '../../services/db.service';
import { FileRepositoryService } from '../../services/file-repository.service';
import { BundleProjectService } from '../../services/bundle-project.service';
import { DetalhesProjetoDialogComponent } from './detalhes-projeto-dialog.component';

describe('DetalhesProjetoDialogComponent', () => {
  let component: DetalhesProjetoDialogComponent;
  let fixture: ComponentFixture<DetalhesProjetoDialogComponent>;
  const project: SavedProject = {
    id: 8,
    nomeProjeto: 'Ensaio',
    pastaBase: 'ensaio',
    config: {
      nomeProjeto: 'Ensaio',
      pastaBase: 'ensaio',
      bpm: 96,
      timeSignature: 4,
      canais: [{ id: 'click', nome: 'Click', arquivo: 'click.wav', volume: -3 }],
      markers: [{ id: 'intro', nome: 'Intro', inicio: '0m', duracao: '4m' }],
    },
  };
  const dialogRef = { close: vi.fn() };
  const fileRepository = {
    duplicateProject: vi.fn(),
    deleteProject: vi.fn(),
    getFileUrl: vi.fn(),
  };
  const bundleService = { exportarParaZip: vi.fn() };

  beforeEach(async () => {
    vi.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [DetalhesProjetoDialogComponent],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: project },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: FileRepositoryService, useValue: fileRepository },
        { provide: BundleProjectService, useValue: bundleService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DetalhesProjetoDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('shows project details with expandable markers and audio channels', () => {
    const text = fixture.nativeElement.textContent as string;

    expect(text).toContain('96');
    expect(text).toContain('Intro');
    expect(text).toContain('Click');
    expect(fixture.nativeElement.querySelector('.marker-item')).not.toBeNull();
  });

  it('returns the project when the user chooses to load it', () => {
    component.carregar();

    expect(dialogRef.close).toHaveBeenCalledWith({ acao: 'carregar', projeto: project });
  });

  it('exports the project as a ZIP with its channel filenames', async () => {
    await component.baixarProjeto();

    expect(bundleService.exportarParaZip).toHaveBeenCalledWith(project.config, ['click.wav']);
  });

  it('opens the duplicated project in edit mode', async () => {
    const copy = { ...project, id: 9, nomeProjeto: 'Ensaio cópia' };
    fileRepository.duplicateProject.mockResolvedValue(copy);

    await component.duplicar();

    expect(dialogRef.close).toHaveBeenCalledWith({ acao: 'editar', projeto: copy });
  });

  it('downloads the selected channel audio from its project folder', async () => {
    fileRepository.getFileUrl.mockResolvedValue({ url: 'blob:track', fromCache: true });
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    await component.baixarAudio('click.wav');

    expect(fileRepository.getFileUrl).toHaveBeenCalledWith('ensaio', 'click.wav');
    expect(clickSpy).toHaveBeenCalledOnce();
    expect(component.status()).toBe('Download iniciado: click.wav');
  });
});