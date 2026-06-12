import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MixerComponent } from './components/mixer/mixer.component';

@Component({
  selector: 'app-root',
  imports: [MixerComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  standalone: true,
})
export class App {
  protected readonly title = signal('multichannel-player');
}
