import { TestBed } from '@angular/core/testing';

import { ExportProjectService } from './export-project.service';

describe('ExportProjectService', () => {
  let service: ExportProjectService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ExportProjectService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
