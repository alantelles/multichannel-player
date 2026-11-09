import { Component, inject } from '@angular/core';
import { NgComponentOutlet } from '@angular/common';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { Eq3EffectComponent } from '../eq3-effect/eq3-effect.component';

@Component({
  selector: 'app-fx-dialog',
  imports: [MatDialogModule, NgComponentOutlet],
  templateUrl: './fx-dialog.component.html',
  styleUrl: './fx-dialog.component.scss',
})
export class FxDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<FxDialogComponent>);
  protected readonly effectComponents = [Eq3EffectComponent] as const;

  fechar(): void {
    this.dialogRef.close();
  }
}