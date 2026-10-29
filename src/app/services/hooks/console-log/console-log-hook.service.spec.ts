import { TestBed } from '@angular/core/testing';

import { ConsoleLogHookService } from './console-log-hook.service';

describe('ConsoleLogHookService', () => {
  let service: ConsoleLogHookService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ConsoleLogHookService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
