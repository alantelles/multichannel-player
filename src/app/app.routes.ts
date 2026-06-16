import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./components/mixer/mixer.component').then(m => m.MixerComponent)
  },
  {
    path: 'criar-projeto',
    loadComponent: () => import('./components/criador-projeto/criador-projeto.component').then(m => m.CriadorProjetoComponent)
  },
  { path: '**', redirectTo: '' } // Fallback seguro
];