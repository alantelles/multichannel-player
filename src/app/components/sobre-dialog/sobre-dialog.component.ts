import { AudioEngineService } from './../../services/audio-engine.service';
import { Component, inject } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-sobre-dialog',
  imports: [NgOptimizedImage, MatDialogModule],
  templateUrl: './sobre-dialog.component.html',
  styleUrl: './sobre-dialog.component.scss',
})
export class SobreDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<SobreDialogComponent>);

  constructor(
    readonly audio: AudioEngineService,
  ) {}
  fechar(): void {
    this.dialogRef.close();
  }
}