import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { vi } from 'vitest';
import { FileRepositoryService } from '../../services/file-repository.service';
import { BundleProjectService } from '../../services/bundle-project.service';
import { ProjectNavigationService } from '../../services/project-navigation.service';
import { NotificacaoService } from '../../services/notificacao.service';
import { AdminProjetosComponent } from './admin-projetos.component';

describe('AdminProjetosComponent', () => {
  let component: AdminProjetosComponent;
  let fixture: ComponentFixture<AdminProjetosComponent>;
  const fileRepository = {
    getProjects: vi.fn().mockResolvedValue([]),
  };
  const bundleService = {
    importarEInstalarZip: vi.fn(async (_arquivo: File, status: { set: (value: string) => void }) => {
      status.set('Projeto importado e salvo no banco local!');
    }),
  };
  const notificacao = { sucesso: vi.fn(), erro: vi.fn() };

  beforeEach(async () => {
    vi.clearAllMocks();
    fileRepository.getProjects.mockResolvedValue([]);
    bundleService.importarEInstalarZip.mockImplementation(async (_arquivo, status) => {
      status.set('Projeto importado e salvo no banco local!');
    });
    await TestBed.configureTestingModule({
      imports: [AdminProjetosComponent],
      providers: [
        { provide: FileRepositoryService, useValue: fileRepository },
        { provide: BundleProjectService, useValue: bundleService },
        { provide: ProjectNavigationService, useValue: { queueProject: vi.fn() } },
        { provide: NotificacaoService, useValue: notificacao },
        { provide: MatDialog, useValue: { open: vi.fn() } },
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminProjetosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('installs a project ZIP and refreshes the project list', async () => {
    const arquivo = { name: 'ensaio.zip' } as File;
    const input = { files: [arquivo], value: 'ensaio.zip' } as unknown as HTMLInputElement;

    await component.importarZip({ target: input } as unknown as Event);

    expect(bundleService.importarEInstalarZip).toHaveBeenCalledWith(arquivo, component.statusImportacao);
    expect(fileRepository.getProjects).toHaveBeenCalledTimes(2);
    expect(component.statusImportacao()).toBe('Projeto importado e salvo no banco local!');
    expect(notificacao.sucesso).toHaveBeenCalledWith('Projeto ZIP importado e salvo no banco local.');
    expect(input.value).toBe('');
  });

  it('rejects a non-ZIP file without calling the installer', async () => {
    const input = { files: [{ name: 'ensaio.json' } as File], value: 'ensaio.json' } as unknown as HTMLInputElement;

    await component.importarZip({ target: input } as unknown as Event);

    expect(bundleService.importarEInstalarZip).not.toHaveBeenCalled();
    expect(component.statusImportacao()).toBe('Selecione um arquivo de projeto ZIP.');
    expect(notificacao.erro).toHaveBeenCalledWith('Selecione um arquivo de projeto ZIP válido.');
    expect(input.value).toBe('');
  });

  it('shows an error when the ZIP installer rejects the archive', async () => {
    bundleService.importarEInstalarZip.mockRejectedValueOnce(new Error('Invalid ZIP'));
    const input = { files: [{ name: 'quebrado.zip' } as File], value: 'quebrado.zip' } as unknown as HTMLInputElement;

    await component.importarZip({ target: input } as unknown as Event);

    expect(component.statusImportacao()).toContain('Não foi possível importar o ZIP');
    expect(fileRepository.getProjects).toHaveBeenCalledTimes(1);
  });
});