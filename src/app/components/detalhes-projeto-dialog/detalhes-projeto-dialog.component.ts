import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { SavedProject } from '../../services/db.service';
import { FileRepositoryService } from '../../services/file-repository.service';
import { BundleProjectService } from '../../services/bundle-project.service';

export type DetalhesProjetoResult =
  | { acao: 'carregar'; projeto: SavedProject }
  | { acao: 'editar'; projeto: SavedProject }
  | { acao: 'atualizar' };

@Component({
  selector: 'app-detalhes-projeto-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule],
  templateUrl: './detalhes-projeto-dialog.component.html',
  styleUrl: './detalhes-projeto-dialog.component.scss',
})
export class DetalhesProjetoDialogComponent {
  readonly projeto = inject<SavedProject>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<DetalhesProjetoDialogComponent>);
  private readonly fileRepository = inject(FileRepositoryService);
  private readonly bundleService = inject(BundleProjectService);

  readonly status = signal('');

  carregar(): void {
    this.dialogRef.close({ acao: 'carregar', projeto: this.projeto } satisfies DetalhesProjetoResult);
  }

  editar(): void {
    this.dialogRef.close({ acao: 'editar', projeto: this.projeto } satisfies DetalhesProjetoResult);
  }

  async duplicar(): Promise<void> {
    try {
      const copia = await this.fileRepository.duplicateProject(this.projeto);
      this.dialogRef.close({ acao: 'editar', projeto: copia } satisfies DetalhesProjetoResult);
    } catch (error) {
      console.error('Erro ao duplicar o projeto:', error);
      this.status.set('Não foi possível duplicar o projeto. Verifique se os áudios estão disponíveis.');
    }
  }

  async baixarProjeto(): Promise<void> {
    const nomesArquivos = this.projeto.config.canais.map(canal => canal.arquivo);
    await this.bundleService.exportarParaZip(this.projeto.config, nomesArquivos);
  }

  async excluir(): Promise<void> {
    if (!this.projeto.id || !confirm(`Deseja remover "${this.projeto.nomeProjeto}" do banco de dados?`)) return;
    await this.fileRepository.deleteProject(this.projeto.id);
    this.dialogRef.close({ acao: 'atualizar' } satisfies DetalhesProjetoResult);
  }

  async baixarAudio(arquivo: string): Promise<void> {
    if (!this.projeto.pastaBase || !arquivo) return;

    try {
      const resultado = await this.fileRepository.getFileUrl(this.projeto.pastaBase, arquivo);
      const link = document.createElement('a');
      link.href = resultado.url;
      link.download = arquivo;
      link.click();
      setTimeout(() => URL.revokeObjectURL(resultado.url), 1000);
      this.status.set(`Download iniciado: ${arquivo}`);
    } catch (error) {
      console.error(`Erro ao baixar o áudio ${arquivo}:`, error);
      const erroHttp = error as { status?: number };
      this.status.set(erroHttp.status === 404
        ? `Arquivo "${arquivo}" não encontrado na pasta "${this.projeto.pastaBase}".`
        : `Não foi possível baixar "${arquivo}".`);
    }
  }

  fechar(): void {
    this.dialogRef.close();
  }
}