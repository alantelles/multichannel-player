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
    alternarEqMaster: vi.fn(),
    alterarEqMaster: vi.fn(),
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

  it('shows EQ3 with three vertical band controls', () => {
    const sliders = fixture.nativeElement.querySelectorAll('input[type="range"]');

    expect(fixture.nativeElement.textContent).toContain('EQ3');
    expect(sliders).toHaveLength(3);
    expect(Array.from(sliders as NodeListOf<HTMLInputElement>).map(slider => slider.getAttribute('aria-label')))
      .toEqual(['Ganho low do EQ3 master', 'Ganho mid do EQ3 master', 'Ganho high do EQ3 master']);
    expect(fixture.nativeElement.querySelector('.effect-toggle').getAttribute('aria-pressed')).toBe('false');
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