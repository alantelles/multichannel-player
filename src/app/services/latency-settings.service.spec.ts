import { TestBed } from '@angular/core/testing';

import { LatencySettingsService } from './latency-settings.service';

describe('LatencySettingsService', () => {
  let service: LatencySettingsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LatencySettingsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
