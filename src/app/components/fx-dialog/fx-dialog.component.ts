import { Component, inject, Type } from '@angular/core';
import { NgComponentOutlet } from '@angular/common';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
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
  protected readonly effectComponents: Type<unknown>[] = [Eq3EffectComponent, MaximizerEffectComponent];

  fechar(): void {
    this.dialogRef.close();
  }
}