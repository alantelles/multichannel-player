import { TestBed } from '@angular/core/testing';
import { ProjectConfig } from './audio-engine.service';
import { ProjectNavigationService } from './project-navigation.service';

describe('ProjectNavigationService', () => {
  let service: ProjectNavigationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ProjectNavigationService);
  });

  it('delivers a queued project only once', () => {
    const config: ProjectConfig = {
      nomeProjeto: 'Ensaio',
      pastaBase: 'ensaio',
      bpm: 96,
      timeSignature: 4,
      canais: [],
    };

    service.queueProject(config);

    expect(service.consumePendingProject()).toEqual(config);
    expect(service.consumePendingProject()).toBeNull();
  });
});