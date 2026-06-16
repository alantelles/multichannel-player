import { TestBed } from '@angular/core/testing';

import { FileRepositoryService } from './file-repository.service';

describe('FileRepositoryService', () => {
  let service: FileRepositoryService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FileRepositoryService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
