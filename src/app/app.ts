import { Component, signal } from '@angular/core';
import { OverlayContainer } from '@angular/cdk/overlay';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly menuAberto = signal(false);
  protected readonly paginaInvertida = signal(false);

  constructor(private readonly overlayContainer: OverlayContainer) {}

  protected fecharMenu(): void {
    this.menuAberto.set(false);
  }

  protected alternarInversao(): void {
    this.paginaInvertida.update(invertida => !invertida);
    this.overlayContainer.getContainerElement().classList.toggle('is-inverted', this.paginaInvertida());
    this.fecharMenu();
  }
}
