import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { RouterLink } from '@angular/router';
import { LATENCY_PROFILES, LatencyProfileKey } from '../../models/latency-config';
import { AdicionarArquivosProjetoComponent } from '../adicionar-arquivos-projeto/adicionar-arquivos-projeto.component';
import { FileRepositoryService } from '../../services/file-repository.service';
import { LatencySettingsService } from '../../services/latency-settings.service';

@Component({
  selector: 'app-configuracoes',
  imports: [CommonModule, FormsModule, MatDialogModule, RouterLink],
  templateUrl: './configuracoes.component.html',
  styleUrl: './configuracoes.component.scss',
})
export class ConfiguracoesComponent {
  private readonly dialog = inject(MatDialog);
  private readonly fileRepository = inject(FileRepositoryService);
  private readonly latencySettings = inject(LatencySettingsService);

  readonly profiles = Object.values(LATENCY_PROFILES);
  readonly selectedKey = signal<LatencyProfileKey>(this.latencySettings.selectedProfileKey());
  readonly customMs = signal(this.latencySettings.customLookaheadMs());
  readonly offsetMs = signal(this.latencySettings.offsetMs());
  readonly remoteRepositoryUrl = signal(localStorage.getItem('audioRepository') || 'audios/');
  readonly status = signal('');

  selecionarPerfil(key: LatencyProfileKey): void {
    this.selectedKey.set(key);
  }

  salvarLatencia(): void {
    if (this.selectedKey() === 'custom') {
      this.latencySettings.setCustomLookahead(this.customMs());
    } else {
      this.latencySettings.setProfile(this.selectedKey());
    }
    this.latencySettings.setOffsetMs(this.offsetMs());
    this.status.set('Configurações de latência aplicadas.');
  }

  salvarRepositorioRemoto(url: string): void {
    this.remoteRepositoryUrl.set(url);
    this.fileRepository.onlineRepositoryUrl.set(url);
    localStorage.setItem('audioRepository', url);
    this.status.set('Repositório remoto atualizado.');
  }

  abrirDialogoAudiosLocais(): void {
    const dialogRef = this.dialog.open(AdicionarArquivosProjetoComponent, {
      width: '500px',
      maxWidth: 'calc(100vw - 32px)',
      disableClose: true,
    });
    dialogRef.componentInstance.aoFechar.subscribe(() => dialogRef.close());
    dialogRef.componentInstance.aoConfirmar.subscribe(async dados => {
      try {
        await this.fileRepository.saveFiles(dados.pastaBase, dados.arquivos);
        this.status.set(`${dados.arquivos.length} áudio(s) adicionado(s) à pasta ${dados.pastaBase}.`);
        dialogRef.close();
      } catch (error) {
        console.error('Erro ao salvar áudios no repositório local:', error);
        this.status.set('Não foi possível salvar os áudios no repositório local.');
      }
    });
  }
}