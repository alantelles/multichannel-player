import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { AudioEngineService } from '../../services/audio-engine.service';
import { FxDialogComponent } from './fx-dialog.component';

describe('FxDialogComponent', () => {
  let fixture: ComponentFixture<FxDialogComponent>;
  const audio = {
    masterEqEnabled: signal(false),
    masterEqLow: signal(0),
    masterEqMid: signal(0),
    masterEqHigh: signal(0),
    masterMaximizerEnabled: signal(false),
    masterMaximizerThreshold: signal(-8),
    alternarEqMaster: vi.fn(),
    alterarEqMaster: vi.fn(),
    alternarMaximizerMaster: vi.fn(),
    alterarMaximizerMasterThreshold: vi.fn(),
  };
  const dialogRef = { close: vi.fn() };

  beforeEach(async () => {
    vi.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [FxDialogComponent],
      providers: [
        { provide: AudioEngineService, useValue: audio },
        { provide: MatDialogRef, useValue: dialogRef },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FxDialogComponent);
    fixture.detectChanges();
  });

  it('shows EQ3 and maximizer controls', () => {
    const sliders = fixture.nativeElement.querySelectorAll('input[type="range"]');

    expect(fixture.nativeElement.textContent).toContain('EQ3');
    expect(fixture.nativeElement.textContent).toContain('Maximizer');
    expect(sliders).toHaveLength(4);
    expect(Array.from(sliders as NodeListOf<HTMLInputElement>).map(slider => slider.getAttribute('aria-label')))
      .toEqual([
        'Ganho low do EQ3 master',
        'Ganho mid do EQ3 master',
        'Ganho high do EQ3 master',
        'Threshold do limiter master em dBFS',
      ]);
    expect(fixture.nativeElement.textContent).not.toContain('Makeup');
    expect(fixture.nativeElement.textContent).not.toContain('−0,3 dBFS');
    const maximizerSlider = sliders[3] as HTMLInputElement;
    expect(maximizerSlider.min).toBe('-25');
    expect(maximizerSlider.max).toBe('0');
    expect(maximizerSlider.value).toBe('-8');
    expect(fixture.nativeElement.querySelector('.eq-bands + *')).toBeNull();
    expect(fixture.nativeElement.querySelectorAll('.effect-toggle')[0].getAttribute('aria-pressed')).toBe('false');
    expect(fixture.nativeElement.querySelectorAll('.effect-toggle')[1].getAttribute('aria-pressed')).toBe('false');
  });

  it('forwards maximizer activation and threshold changes to the audio engine', () => {
    const toggles = fixture.nativeElement.querySelectorAll('.effect-toggle') as NodeListOf<HTMLButtonElement>;
    const sliders = fixture.nativeElement.querySelectorAll('input[type="range"]') as NodeListOf<HTMLInputElement>;

    toggles[1].click();
    sliders[3].value = '-5';
    sliders[3].dispatchEvent(new Event('input'));

    expect(audio.alternarMaximizerMaster).toHaveBeenCalledOnce();
    expect(audio.alterarMaximizerMasterThreshold).toHaveBeenCalledWith(-5);
  });

  it('forwards EQ activation and band gain changes to the audio engine', () => {
    const toggle = fixture.nativeElement.querySelector('.effect-toggle') as HTMLButtonElement;
    const sliders = fixture.nativeElement.querySelectorAll('input[type="range"]') as NodeListOf<HTMLInputElement>;

    toggle.click();
    sliders[1].value = '5';
    sliders[1].dispatchEvent(new Event('input'));

    expect(audio.alternarEqMaster).toHaveBeenCalledOnce();
    expect(audio.alterarEqMaster).toHaveBeenCalledWith('mid', 5);
  });

  it('closes from the dialog close button', () => {
    (fixture.nativeElement.querySelector('.close-button') as HTMLButtonElement).click();

    expect(dialogRef.close).toHaveBeenCalledOnce();
  });
});