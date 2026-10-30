import { Injectable, signal } from '@angular/core';
import { ProjectConfig } from './audio-engine.service';

@Injectable({ providedIn: 'root' })
export class ProjectNavigationService {
  private readonly pendingProject = signal<ProjectConfig | null>(null);

  queueProject(project: ProjectConfig): void {
    this.pendingProject.set(project);
  }

  consumePendingProject(): ProjectConfig | null {
    const project = this.pendingProject();
    this.pendingProject.set(null);
    return project;
  }
}