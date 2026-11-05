import { Routes } from '@angular/router';
import { confirmarSaidaMixerGuard } from './guards/confirmar-saida-mixer.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./components/mixer/mixer.component').then(m => m.MixerComponent),
    canDeactivate: [confirmarSaidaMixerGuard],
  },
  {
    path: 'criar-projeto',
    loadComponent: () => import('./components/criador-projeto/criador-projeto.component').then(m => m.CriadorProjetoComponent)
  },
  {
    path: 'projetos',
    loadComponent: () => import('./components/admin-projetos/admin-projetos.component').then(m => m.AdminProjetosComponent)
  },
  {
    path: 'configuracoes',
    loadComponent: () => import('./components/configuracoes/configuracoes.component').then(m => m.ConfiguracoesComponent)
  },
  { path: '**', redirectTo: '' } // Fallback seguro
];