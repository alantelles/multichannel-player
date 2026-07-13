import { TestBed } from '@angular/core/testing';

import { BundleProjectService } from './bundle-project.service';

describe('ExportProjectService', () => {
  let service: BundleProjectService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BundleProjectService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
