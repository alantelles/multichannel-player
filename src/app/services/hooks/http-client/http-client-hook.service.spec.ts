import { TestBed } from '@angular/core/testing';

import { HttpClientHookService } from './http-client-hook.service';

describe('HttpClientHookService', () => {
  let service: HttpClientHookService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(HttpClientHookService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
