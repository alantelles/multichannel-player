import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  standalone: true,
  template: `<div class="app-container">
    <router-outlet></router-outlet>
  </div>
  `
})
export class App {
  protected readonly title = signal('multichannel-player');
}
