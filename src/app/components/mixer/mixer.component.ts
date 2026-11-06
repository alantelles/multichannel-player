import { Component, inject, OnInit, signal } from '@angular/core';
import { AudioEngineService, CanalAudio } from '../../services/audio-engine.service';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { FileRepositoryService } from '../../services/file-repository.service';
import { CommonModule } from '@angular/common';
import { Marker } from '../../models/marker';
import {
  SelecionarProjetoDialogComponent,
  SelecionarProjetoDialogResult,
} from '../selecionar-projeto-dialog/selecionar-projeto-dialog.component';
import { ProjectNavigationService } from '../../services/project-navigation.service';
import { ConfirmacaoDialogService } from '../../services/confirmacao-dialog.service';
import { FxDialogComponent } from '../fx-dialog/fx-dialog.component';

@Component({
  selector: 'app-mixer',
  standalone: true,
  imports: [FormsModule, MatDialogModule, CommonModule],
  templateUrl: './mixer.component.html', // ou mixer.component.html dependendo de como foi gerado
  styleUrl: './mixer.component.scss'     // ou mixer.component.scss
})
export class MixerComponent implements OnInit {
  // Injeta o serviço corrigido usando a sintaxe moderna inject()
  protected audio = inject(AudioEngineService);
  private dialog = inject(MatDialog);
  private readonly confirmacaoDialog = inject(ConfirmacaoDialogService);
  private projectNavigation = inject(ProjectNavigationService);
  fileRepository = inject(FileRepositoryService);
  // Timer para controlar o atraso do clique simples
  private clickTimer: any = null;
  private readonly DOUBLE_CLICK_DELAY = 250; // tempo em ms para aguardar o 2º clique
  private lastVolumeResetTap: { targetId: string; timestamp: number } | null = null;
  private lastPanResetTap: { targetId: string; timestamp: number } | null = null;
  private readonly DOUBLE_TAP_DELAY = 350;
  visualizacaoSequencia = signal<boolean>(true);

  isFullSong(): boolean {
    return this.audio.trechoAtivo()?.id === 'full-audio';
  }

  abrirModalProjetosSalvos() {
    const dialogRef = this.dialog.open(SelecionarProjetoDialogComponent, {
      width: '90%',
      maxWidth: '680px',
      data: { origem: 'mixer' },
      autoFocus: window.matchMedia('(max-width: 600px)').matches
        ? '.dialog-header h2'
        : 'input[type="search"]'
    });

    dialogRef.afterClosed().subscribe((resultado: SelecionarProjetoDialogResult | undefined) => {
      if (resultado?.acao === 'carregar') {
        const jsonString = JSON.stringify(resultado.config);
        this.audio.carregarProjetoPorJSON(jsonString);
      }
    });
  }

  abrirFxMaster(): void {
    this.dialog.open(FxDialogComponent, {
      width: 'min(92vw, 340px)',
      maxWidth: '340px',
      ariaLabel: 'Efeitos do master',
      autoFocus: 'button.effect-toggle',
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
    const projetoPendente = this.projectNavigation.consumePendingProject();
    if (projetoPendente) {
      void this.audio.carregarProjetoPorJSON(JSON.stringify(projetoPendente));
    }
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

  async confirmarSaida(): Promise<boolean> {
    if (!this.audio.isPlaying()) {
      return true;
    }

    const confirmou = await this.confirmacaoDialog.confirmar({
      titulo: 'Interromper reprodução?',
      mensagem: 'O player está tocando. Ao sair do mixer, a reprodução será interrompida.',
      textoConfirmacao: 'Parar e sair',
      textoCancelamento: 'Continuar tocando',
      aparencia: 'perigo',
    });
    if (!confirmou) {
      return false;
    }

    await this.audio.togglePlay();
    return true;
  }

  atualizarVolumeRange(canal: any, event: Event) {
    const input = event.target as HTMLInputElement;
    this.audio.alterarVolume(canal, Number(input.value));
  }

  atualizarPanRange(canal: CanalAudio, event: Event) {
    const input = event.target as HTMLInputElement;
    this.audio.alterarPan(canal, Number(input.value) / 50);
  }

  formatarPan(pan: number): string {
    const valor = Math.round(Math.abs(pan) * 50);
    if (valor === 0) return '0';
    return pan < 0 ? `L ${valor}` : `R ${valor}`;
  }

  resetarPanNoDuploToque(canal: CanalAudio, event: TouchEvent) {
    if (event.changedTouches.length !== 1) return;

    const previousTap = this.lastPanResetTap;
    if (previousTap?.targetId === canal.id && event.timeStamp - previousTap.timestamp <= this.DOUBLE_TAP_DELAY) {
      event.preventDefault();
      this.lastPanResetTap = null;
      this.audio.alterarPan(canal, 0);
      return;
    }

    this.lastPanResetTap = { targetId: canal.id, timestamp: event.timeStamp };
  }

  atualizarVolumeMaster(event: Event) {
    const input = event.target as HTMLInputElement;
    this.audio.alterarVolumeMaster(Number(input.value));
  }

  resetarVolumeNoDuploToque(target: CanalAudio | 'master', event: TouchEvent) {
    if (event.changedTouches.length !== 1) return;

    const targetId = target === 'master' ? 'master' : `channel:${target.id}`;
    const previousTap = this.lastVolumeResetTap;
    if (previousTap?.targetId === targetId && event.timeStamp - previousTap.timestamp <= this.DOUBLE_TAP_DELAY) {
      event.preventDefault();
      this.lastVolumeResetTap = null;
      if (target === 'master') {
        this.audio.alterarVolumeMaster(0);
      } else {
        this.audio.alterarVolume(target, 0);
      }
      return;
    }

    this.lastVolumeResetTap = { targetId, timestamp: event.timeStamp };
  }

  selecionarSaidaFisica(canal: any, event: Event) {
    const select = event.target as HTMLSelectElement;
    this.audio.alterarSaidaFisica(canal, Number(select.value));
  }
}