// selecionar-projeto-dialog.component.ts
import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { FileRepositoryService } from '../../services/file-repository.service';
import { SavedProject } from '../../services/db.service';
import { BundleProjectService } from '../../services/bundle-project.service';

@Component({
  selector: 'app-selecionar-projeto-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule],
  templateUrl: './selecionar-projeto-dialog.component.html',
  styleUrls: ['./selecionar-projeto-dialog.component.scss'],
})
export class SelecionarProjetoDialogComponent implements OnInit {
  private fileRepo = inject(FileRepositoryService);
  private bundleService = inject(BundleProjectService);
  private dialogRef = inject(MatDialogRef<SelecionarProjetoDialogComponent>);

  projetos = signal<SavedProject[]>([]);
  filtro = signal<string>('');
  carregando = signal<boolean>(true);

  async ngOnInit() {
    await this.carregarLista();
  }

  async carregarLista() {
    this.carregando.set(true);
    const lista = await this.fileRepo.getProjects(this.filtro());
    this.projetos.set(lista);
    this.carregando.set(false);
  }

  async onFiltroChange(valor: string) {
    this.filtro.set(valor);
    await this.carregarLista();
  }

  selecionar(projeto: SavedProject) {
    this.dialogRef.close(projeto.config);
  }

  async baixarProjeto(projeto: SavedProject) {
    const nomesArquivos = projeto.config.canais.map(canal => canal.arquivo);
    await this.bundleService.exportarParaZip(projeto.config, nomesArquivos);
  }

  async deletar(projeto: SavedProject) {
    if (projeto.id && confirm(`Deseja remover "${projeto.nomeProjeto}" do banco de dados?`)) {
      await this.fileRepo.deleteProject(projeto.id);
      await this.carregarLista();
    }
  }

  fechar() {
    this.dialogRef.close(null);
  }
}