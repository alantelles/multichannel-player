import { inject, Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({ providedIn: 'root' })
export class NotificacaoService {
  private readonly snackBar = inject(MatSnackBar);

  sucesso(mensagem: string): void {
    this.exibir(mensagem, 'success');
  }

  erro(mensagem: string): void {
    this.exibir(mensagem, 'error');
  }

  private exibir(mensagem: string, tipo: 'success' | 'error'): void {
    this.snackBar.open(mensagem, 'Fechar', {
      duration: 5000,
      horizontalPosition: 'center',
      verticalPosition: 'top',
      panelClass: ['task-snackbar', `task-snackbar-${tipo}`],
      politeness: tipo === 'error' ? 'assertive' : 'polite',
    });
  }
}