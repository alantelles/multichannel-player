import { TestBed } from '@angular/core/testing';

import { AudioLoaderServiceService } from './audio-loader-service.service';

describe('AudioLoaderServiceService', () => {
  let service: AudioLoaderServiceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AudioLoaderServiceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
