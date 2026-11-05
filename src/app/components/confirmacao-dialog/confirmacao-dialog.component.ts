import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

export interface ConfirmacaoDialogData {
  titulo: string;
  mensagem: string;
  textoConfirmacao: string;
  textoCancelamento: string;
  aparencia: 'perigo' | 'normal';
}

@Component({
  selector: 'app-confirmacao-dialog',
  imports: [MatDialogModule],
  templateUrl: './confirmacao-dialog.component.html',
  styleUrl: './confirmacao-dialog.component.scss',
})
export class ConfirmacaoDialogComponent {
  readonly data = inject<ConfirmacaoDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<ConfirmacaoDialogComponent, boolean>);

  cancelar(): void {
    this.dialogRef.close(false);
  }

  confirmar(): void {
    this.dialogRef.close(true);
  }
}