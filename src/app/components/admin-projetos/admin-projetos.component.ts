import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { FileRepositoryService } from '../../services/file-repository.service';
import { BundleProjectService } from '../../services/bundle-project.service';
import { ProjectNavigationService } from '../../services/project-navigation.service';
import { SavedProject } from '../../services/db.service';
import {
  DetalhesProjetoDialogComponent,
  DetalhesProjetoResult,
} from '../detalhes-projeto-dialog/detalhes-projeto-dialog.component';

@Component({
  selector: 'app-admin-projetos',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MatDialogModule],
  templateUrl: './admin-projetos.component.html',
  styleUrl: './admin-projetos.component.scss',
})
export class AdminProjetosComponent implements OnInit {
  private readonly fileRepository = inject(FileRepositoryService);
  private readonly bundleService = inject(BundleProjectService);
  private readonly projectNavigation = inject(ProjectNavigationService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);

  readonly projetos = signal<SavedProject[]>([]);
  readonly filtro = signal('');
  readonly carregando = signal(true);
  readonly statusImportacao = signal('');

  async ngOnInit(): Promise<void> {
    await this.carregarProjetos();
  }

  async carregarProjetos(): Promise<void> {
    this.carregando.set(true);
    this.projetos.set(await this.fileRepository.getProjects(this.filtro()));
    this.carregando.set(false);
  }

  async atualizarFiltro(valor: string): Promise<void> {
    this.filtro.set(valor);
    await this.carregarProjetos();
  }

  async alternarFavorito(projeto: SavedProject): Promise<void> {
    if (projeto.id === undefined) return;
    await this.fileRepository.toggleProjectFavorite(projeto.id);
    await this.carregarProjetos();
  }

  async importarZip(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const arquivo = input.files?.[0];
    input.value = '';
    if (!arquivo) return;

    if (!arquivo.name.toLowerCase().endsWith('.zip')) {
      this.statusImportacao.set('Selecione um arquivo de projeto ZIP.');
      return;
    }

    this.statusImportacao.set('Instalando projeto ZIP...');
    try {
      await this.bundleService.importarEInstalarZip(arquivo, this.statusImportacao);
      await this.carregarProjetos();
    } catch (error) {
      console.error('Erro ao importar projeto ZIP:', error);
      this.statusImportacao.set('Não foi possível importar o ZIP. Verifique se o arquivo contém um projeto válido.');
    }
  }

  abrirDetalhes(projeto: SavedProject): void {
    const ref = this.dialog.open(DetalhesProjetoDialogComponent, {
      width: '90%',
      maxWidth: '820px',
      data: projeto,
    });

    ref.afterClosed().subscribe((resultado: DetalhesProjetoResult | undefined) => {
      if (!resultado) return;

      if (resultado.acao === 'carregar') {
        this.projectNavigation.queueProject(resultado.projeto.config);
        void this.router.navigateByUrl('/');
      } else if (resultado.acao === 'editar') {
        void this.router.navigate(['/criar-projeto'], { state: { projeto: resultado.projeto } });
      } else {
        void this.carregarProjetos();
      }
    });
  }
}