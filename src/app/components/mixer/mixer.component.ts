import { Component, inject, OnInit, signal } from '@angular/core';
import { AudioEngineService, Marker } from '../../services/audio-engine.service'; // Ajuste o caminho se o seu arquivo tiver .service no nome
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { AdicionarArquivosProjetoComponent } from '../adicionar-arquivos-projeto/adicionar-arquivos-projeto.component';
import { FileRepositoryService } from '../../services/file-repository.service';
import { RouterLink } from "@angular/router";
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-mixer',
  standalone: true,
  imports: [FormsModule, MatDialogModule, RouterLink, CommonModule],
  templateUrl: './mixer.component.html', // ou mixer.component.html dependendo de como foi gerado
  styleUrl: './mixer.component.scss'     // ou mixer.component.scss
})
export class MixerComponent implements OnInit {
  // Injeta o serviço corrigido usando a sintaxe moderna inject()
  protected audio = inject(AudioEngineService);
  private dialog = inject(MatDialog);
  fileRepository = inject(FileRepositoryService);

  private pressTimeout: any;
  private foiDisparoInstantaneo = false;
  trechoPressionado: Marker | null = null;
  visualizacaoSequencia = signal<boolean>(true);
  // 🎯 NOVO: Lê o arquivo JSON de configuração mapeado pelo usuário
  onConfigSelecionada(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const arquivoConfig = input.files[0];
      const reader = new FileReader();

      reader.onload = (e: any) => {
        const conteudoTexto = e.target.result;
        this.audio.carregarProjetoPorJSON(conteudoTexto);
      };

      reader.readAsText(arquivoConfig);
    }
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
  iniciarPress(trechoId: string) {
    if (!this.audio.isPlaying()) {
      return; // Se não estiver tocando, não faz nada
    }
    this.foiDisparoInstantaneo = false;
    this.trechoPressionado = this.audio.markers().find(marker => marker.id === trechoId) || null;
    // Se segurar por 500ms, é um comando de emergência!
    this.pressTimeout = setTimeout(() => {
      this.audio.dispararTrechoInstantaneamente(trechoId);
      this.foiDisparoInstantaneo = true; // Avisa que o braço de emergência já foi executado
      
      // Feedback tátil opcional para celulares Android (vibra de leve ao ativar)
      if (navigator.vibrate) navigator.vibrate(50); 
    }, 500); 
  }

  finalizarPress(trechoId: string) {
    // Limpa o cronômetro para o disparo instantâneo não acontecer no futuro
    this.cancelarPress();
    this.trechoPressionado = null;
    // Se o usuário soltou o botão ANTES dos 500ms, é um clique normal (Musical)
    if (!this.foiDisparoInstantaneo) {
      const proximo = this.audio.proximoTrecho();
      if (proximo && proximo.id === trechoId) {
        // Se o trecho clicado é o mesmo que já estava agendado como próximo, desagendar
        this.cancelarProximoTrecho();
        return;
      }
      this.audio.agendarTrecho(trechoId);
    }
  }

  cancelarPress() {
    if (this.pressTimeout) {
      clearTimeout(this.pressTimeout);
    }
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
    if (!trechoAtivo) {
      return '#818181'; // Cor padrão se não houver trecho ativo
    }
    if (this.trechoPressionado && this.trechoPressionado.id === marker.id) {
      return '#fd2929'; // Vermelho para trecho pressionado
    }
    if (trechoAtivo.id === marker.id) {
      return '#28a745'; // Verde para trecho ativo
    }
    if (proximoTrecho && proximoTrecho.id === marker.id) {
      return '#ffc107'; // Amarelo para próximo trecho
    }
    if (trechoAtivo.nextMarker && trechoAtivo.nextMarker === marker.id) {
      return '#0772ff'; // Azul para próximo trecho
    }
    return '#818181'; // Cor padrão para outros trechos
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
  // ... dentro da classe MixerComponent
  selecionarTrecho(id: string) {
    this.audio.agendarTrecho(id);
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