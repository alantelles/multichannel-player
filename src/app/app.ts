import { Component, inject, signal } from '@angular/core';
import { OverlayContainer } from '@angular/cdk/overlay';
import { NgOptimizedImage } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { SobreDialogComponent } from './components/sobre-dialog/sobre-dialog.component';

@Component({
  selector: 'app-root',
  imports: [NgOptimizedImage, RouterLink, RouterLinkActive, RouterOutlet, MatSnackBarModule],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly menuAberto = signal(false);
  protected readonly paginaInvertida = signal(false);
  private readonly dialog = inject(MatDialog);

  constructor(private readonly overlayContainer: OverlayContainer) {}

  protected fecharMenu(): void {
    this.menuAberto.set(false);
  }

  protected abrirSobre(): void {
    this.fecharMenu();
    this.dialog.open(SobreDialogComponent, {
      width: '380px',
      maxWidth: 'calc(100vw - 32px)',
      ariaLabelledBy: 'about-title',
    });
  }

  protected fecharMenuAoClicarFora(event: MouseEvent): void {
    if (!this.menuAberto()) return;
    if (typeof window.matchMedia === 'function' && !window.matchMedia('(max-width: 640px)').matches) return;

    const alvo = event.target;
    if (!(alvo instanceof Element) || alvo.closest('#main-navigation, .menu-toggle')) return;

    this.fecharMenu();
  }

  protected alternarInversao(): void {
    this.paginaInvertida.update(invertida => !invertida);
    this.overlayContainer.getContainerElement().classList.toggle('is-inverted', this.paginaInvertida());
    this.fecharMenu();
  }
}
