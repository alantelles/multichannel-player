import { Component, inject, signal, Type } from '@angular/core';
import { NgComponentOutlet } from '@angular/common';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { AudioEngineService } from '../../services/audio-engine.service';
import { Eq3EffectComponent } from '../eq3-effect/eq3-effect.component';
import { MaximizerEffectComponent } from '../maximizer-effect/maximizer-effect.component';

@Component({
  selector: 'app-fx-dialog',
  imports: [MatDialogModule, NgComponentOutlet],
  templateUrl: './fx-dialog.component.html',
  styleUrl: './fx-dialog.component.scss',
})
export class FxDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<FxDialogComponent>);
  protected readonly audio = inject(AudioEngineService);
  protected readonly actionMessage = signal('');
  protected readonly effectComponents: Type<unknown>[] = [Eq3EffectComponent, MaximizerEffectComponent];

  salvarEfeitos(): void {
    this.actionMessage.set(this.audio.salvarEfeitosMaster()
      ? 'Ajustes e volume salvos.'
      : 'Não foi possível salvar os ajustes.');
  }

  usarEfeitosSalvos(): void {
    this.actionMessage.set(this.audio.usarEfeitosMasterSalvos()
      ? 'Ajustes e volume salvos aplicados.'
      : 'Nenhum ajuste salvo encontrado.');
  }

  alternarBypassEfeitos(): void {
    this.audio.alternarBypassEfeitosMaster();
    this.actionMessage.set(this.audio.masterEffectsBypassed()
      ? 'Todos os efeitos foram desligados.'
      : 'Efeitos ligados conforme o estado de cada módulo.');
  }

  fechar(): void {
    this.dialogRef.close();
  }
}