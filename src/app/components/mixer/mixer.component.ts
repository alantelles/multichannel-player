import { Component, inject, OnInit, signal } from '@angular/core';
import { AudioEngineService, ProjectConfig } from '../../services/audio-engine.service'; // Ajuste o caminho se o seu arquivo tiver .service no nome
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { AdicionarArquivosProjetoComponent } from '../adicionar-arquivos-projeto/adicionar-arquivos-projeto.component';
import { FileRepositoryService } from '../../services/file-repository.service';
import { RouterLink } from "@angular/router";
import { CommonModule } from '@angular/common';
import { Marker } from '../../models/marker';
import { SelecionarProjetoDialogComponent } from '../selecionar-projeto-dialog/selecionar-projeto-dialog.component';
import { LatencyModalComponent } from '../latency-modal/latency-modal.component';

@Component({
  selector: 'app-mixer',
  standalone: true,
  imports: [FormsModule, MatDialogModule, RouterLink, CommonModule, LatencyModalComponent],
  templateUrl: './mixer.component.html', // ou mixer.component.html dependendo de como foi gerado
  styleUrl: './mixer.component.scss'     // ou mixer.component.scss
})
export class MixerComponent implements OnInit {
  // Injeta o serviço corrigido usando a sintaxe moderna inject()
  protected audio = inject(AudioEngineService);
  private dialog = inject(MatDialog);
  fileRepository = inject(FileRepositoryService);
  // Timer para controlar o atraso do clique simples
  private clickTimer: any = null;
  private readonly DOUBLE_CLICK_DELAY = 250; // tempo em ms para aguardar o 2º clique
  visualizacaoSequencia = signal<boolean>(true);

  exibirModalLatencia = signal<boolean>(false);

  abrirConfiguracoes(): void {
    this.exibirModalLatencia.set(true);
  }

  fecharConfiguracoes(): void {
    this.exibirModalLatencia.set(false);
  }
  isFullSong(): boolean {
    return this.audio.trechoAtivo()?.id === 'full-audio';
  }
  // 🎯 NOVO: Lê o arquivo JSON de configuração mapeado pelo usuário
  onConfigSelecionada(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const arquivoConfig = input.files[0];
      const reader = new FileReader();

      reader.onload = async (e: any) => {
        const conteudoTexto = e.target.result;
        const loaded = await this.audio.carregarProjetoPorJSON(conteudoTexto);
        if (!loaded) {
          return;
        }
        const config: ProjectConfig = JSON.parse(conteudoTexto);
        this.fileRepository.saveProject(config); // 🎯 Salva no IndexedDB
      };

      reader.readAsText(arquivoConfig);
    }
  }
  
  abrirModalProjetosSalvos() {
    const dialogRef = this.dialog.open(SelecionarProjetoDialogComponent, {
      width: '90%',
      maxWidth: '680px'
    });

    dialogRef.afterClosed().subscribe((configProjetoSelected) => {
      if (configProjetoSelected) {
        // Converte o objeto de volta para string JSON e envia para a Engine de Áudio
        const jsonString = JSON.stringify(configProjetoSelected);
        this.audio.carregarProjetoPorJSON(jsonString);
      }
    });
  }

  selecionarTrecho(id: string, event?: MouseEvent) {
    const trecho = this.audio.markers().find(m => m.id === id);
    if (!trecho) return;

    // Se o marcador for configurado para sempre entrar no compasso (ex: Viradas)
    if (trecho.modoDisparo === 'compasso') {
      if (this.clickTimer) {
        clearTimeout(this.clickTimer);
        this.clickTimer = null;
      }
      // Dispara no próximo compasso mesmo com clique único!
      this.audio.dispararTrechoNoProximoCompasso(id);
      return;
    }

    // Comportamento padrão para os demais trechos (1 clique = bloco, 2 cliques = compasso)
    if (this.clickTimer) {
      clearTimeout(this.clickTimer);
      this.clickTimer = null;
      this.audio.dispararTrechoNoProximoCompasso(id);
      return;
    }

    this.clickTimer = setTimeout(() => {
      this.clickTimer = null;
      this.audio.agendarTrecho(id);
    }, this.DOUBLE_CLICK_DELAY);
  }

  ngOnInit() {
    const savedAudioRepository = localStorage.getItem('audioRepository');
    this.fileRepository.onlineRepositoryUrl.set(savedAudioRepository || 'audios/');
    const estadoVisualizacao = localStorage.getItem('visualizacaoSequencia');
    this.visualizacaoSequencia.set(estadoVisualizacao === 'true');
  }
  toggleVisualizacaoSequencia() {
    const novoEstado = !this.visualizacaoSequencia();
    this.visualizacaoSequencia.set(novoEstado);
    localStorage.setItem('visualizacaoSequencia', String(novoEstado));
  }
 
  cancelarProximoTrecho() {
    this.audio.agendarTrecho('');
  }
  irParaFim() {
    // TODO: ir para um trecho sinalizado como fim
  }


  decidirCorTrecho(marker: Marker): string {
    const trechoAtivo = this.audio.trechoAtivo();
    const proximoTrecho = this.audio.proximoTrecho();
    const proximoTrechoImediato = this.audio.proximoTrechoImediato();

    if (!trechoAtivo) {
      return '#818181';
    }
    
    if (trechoAtivo.id === marker.id) {
      return '#28a745'; // Verde para trecho tocando agora
    }
    
    // 🎯 Destaque para o disparo de PRÓXIMO COMPASSO (Duplo Clique)
    if (proximoTrechoImediato && proximoTrechoImediato.id === marker.id) {
      return '#ff5722'; // Laranja avermelhado vibrante
    }

    // Destaque para o agendamento de FIM DE BLOCO (Clique simples)
    if (proximoTrecho && proximoTrecho.id === marker.id) {
      return '#ffc107'; // Amarelo
    }

    if (trechoAtivo.nextMarker && trechoAtivo.nextMarker === marker.id) {
      return '#0772ff'; // Azul para automação padrão
    }

    return '#818181';
  }
  adicionarArquivosLocal() {
    const dialogRef = this.dialog.open(AdicionarArquivosProjetoComponent, {
      width: '500px', disableClose: true
    });
    dialogRef.componentInstance.aoFechar.subscribe(() => dialogRef.close());
    
    dialogRef.componentInstance.aoConfirmar.subscribe(async dados => {
      console.log('Dados recebidos no Mixer:', dados);
      await this.fileRepository.saveFiles(dados.pastaBase, dados.arquivos);
      dialogRef.close();
    });
  }

  setAudioRepository(novaUrl: string) {
    this.fileRepository.onlineRepositoryUrl.set(novaUrl);
    localStorage.setItem('audioRepository', novaUrl);
  }

  backgroundColorPlayButton(): string {
    if (this.audio.isFullyLoaded()) {
      return this.audio.isPlaying() ? '#dc3545' : '#28a745'
    }
    return '#818181'
  }

  // Inicializa o motor de áudio no primeiro clique/interação por segurança do browser
  async ligarMesa() {
    await this.audio.init();
  }
  // ... dentro da classe MixerComponent
  alternarPlay() {
    this.audio.togglePlay();
  }
  atualizarVolumeRange(canal: any, event: Event) {
    const input = event.target as HTMLInputElement;
    this.audio.alterarVolume(canal, Number(input.value));
  }

  selecionarSaidaFisica(canal: any, event: Event) {
    const select = event.target as HTMLSelectElement;
    this.audio.alterarSaidaFisica(canal, Number(select.value));
  }
}