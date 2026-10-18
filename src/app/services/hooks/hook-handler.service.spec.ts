import { TestBed } from '@angular/core/testing';

import { HookHandlerService } from './hook-handler.service';

describe('HookHandlerService', () => {
  let service: HookHandlerService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(HookHandlerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
