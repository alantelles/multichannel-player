import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ComponentFixture, TestBed } from '@angular/core/testing';

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

describe('AdicionarArquivosProjetoComponent', () => {
  let component: AdicionarArquivosProjetoComponent;
  let fixture: ComponentFixture<AdicionarArquivosProjetoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdicionarArquivosProjetoComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AdicionarArquivosProjetoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('starts with the confirmation action disabled until valid inputs are supplied', () => {
    const confirmButton = fixture.nativeElement.querySelector('.btn-confirmar') as HTMLButtonElement;

    expect(confirmButton.disabled).toBe(true);
  });

  it('filters selected files to supported audio types and extensions', () => {
    const audio = new File(['audio'], 'kick.wav', { type: 'audio/wav' });
    const audioByExtension = new File(['audio'], 'snare.mp3', { type: 'application/octet-stream' });
    const document = new File(['text'], 'notes.txt', { type: 'text/plain' });
    const event = { target: { files: [audio, audioByExtension, document] } } as unknown as Event;

    component.aoSelecionarArquivos(event);

    expect(component.arquivosSelecionados).toEqual([audio, audioByExtension]);
  });

  it('emits trimmed folder name and selected audio files on confirmation', () => {
    const audio = new File(['audio'], 'kick.wav', { type: 'audio/wav' });
    const confirmSpy = vi.spyOn(component.aoConfirmar, 'emit');
    component.pastaBaseNome = ' ensaio ';
    component.arquivosSelecionados = [audio];

    component.confirmarUpload();

    expect(confirmSpy).toHaveBeenCalledWith({ pastaBase: 'ensaio', arquivos: [audio] });
  });

  it('emits cancel without saving', () => {
    const cancelSpy = vi.spyOn(component.aoFechar, 'emit');

    component.cancelar();

    expect(cancelSpy).toHaveBeenCalledOnce();
  });
});