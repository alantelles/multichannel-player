import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface DadosUploadProjeto {
  pastaBase: string;
  arquivos: File[];
}

@Component({
  selector: 'app-enviar-projeto-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './adicionar-arquivos-projeto.component.html',
  styleUrls: ['./adicionar-arquivos-projeto.component.scss']
})
export class AdicionarArquivosProjetoComponent {
  // Estado do formulário
  public pastaBaseNome: string = '';
  public arquivosSelecionados: File[] = [];

  // Eventos para comunicação com o componente pai (ou gerenciador de modais)
  @Output() aoConfirmar = new EventEmitter<DadosUploadProjeto>();
  @Output() aoFechar = new EventEmitter<void>();

  /**
   * Captura e filtra os arquivos de áudio selecionados pelo usuário
   */
  public aoSelecionarArquivos(event: Event): void {
    const input = event.target as HTMLInputElement;
    
    if (!input.files || input.files.length === 0) {
      this.arquivosSelecionados = [];
      return;
    }

    // Convertemos a FileList para Array nativo para facilitar manipulações
    const listaArquivos = Array.from(input.files);

    // Filtro de segurança caso o SO ignore o atributo 'accept' do HTML
    this.arquivosSelecionados = listaArquivos.filter(arquivo => {
      const tipo = arquivo.type.toLowerCase();
      const extensao = arquivo.name.split('.').pop()?.toLowerCase();

      return (
        tipo.startsWith('audio/') || 
        ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac', 'webm'].includes(extensao || '')
      );
    });
  }

  /**
   * Dispara o evento de confirmação enviando os dados limpos
   */
  public confirmarUpload(): void {
    if (!this.pastaBaseNome.trim() || this.arquivosSelecionados.length === 0) return;

    this.aoConfirmar.emit({
      pastaBase: this.pastaBaseNome.trim(),
      arquivos: this.arquivosSelecionados
    });
  }

  /**
   * Fecha o diálogo sem realizar ações
   */
  public cancelar(): void {
    this.aoFechar.emit();
  }
}