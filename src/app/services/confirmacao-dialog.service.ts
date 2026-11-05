import { inject, Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';
import {
  ConfirmacaoDialogComponent,
  ConfirmacaoDialogData,
} from '../components/confirmacao-dialog/confirmacao-dialog.component';

export type ConfirmacaoDialogOptions = Pick<ConfirmacaoDialogData, 'titulo' | 'mensagem'>
  & Partial<Omit<ConfirmacaoDialogData, 'titulo' | 'mensagem'>>;

@Injectable({ providedIn: 'root' })
export class ConfirmacaoDialogService {
  private readonly dialog = inject(MatDialog);

  confirmar(options: ConfirmacaoDialogOptions): Promise<boolean> {
    const data: ConfirmacaoDialogData = {
      textoConfirmacao: 'Confirmar',
      textoCancelamento: 'Cancelar',
      aparencia: 'normal',
      ...options,
    };
    const dialogRef = this.dialog.open(ConfirmacaoDialogComponent, {
      data,
      width: 'calc(100vw - 32px)',
      maxWidth: '430px',
      role: 'alertdialog',
      ariaLabelledBy: 'confirmation-title',
      ariaDescribedBy: 'confirmation-message',
      autoFocus: '.cancel-button',
    });

    return firstValueFrom(dialogRef.afterClosed()).then(result => result === true);
  }
}