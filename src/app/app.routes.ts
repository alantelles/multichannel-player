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
  {
    path: 'projetos',
    loadComponent: () => import('./components/admin-projetos/admin-projetos.component').then(m => m.AdminProjetosComponent)
  },
  { path: '**', redirectTo: '' } // Fallback seguro
];