import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { AudioEngineService } from '../../services/audio-engine.service';
import { FxDialogComponent } from './fx-dialog.component';

describe('FxDialogComponent', () => {
  let fixture: ComponentFixture<FxDialogComponent>;
  const audio = {
    masterEffectsBypassed: signal(false),
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
    salvarEfeitosMaster: vi.fn(() => true),
    usarEfeitosMasterSalvos: vi.fn(() => true),
    alternarBypassEfeitosMaster: vi.fn(() => audio.masterEffectsBypassed.update(value => !value)),
    resetarEqMaster: vi.fn(),
    usarEqMasterSalvo: vi.fn(() => true),
    resetarMaximizerMaster: vi.fn(),
    usarMaximizerMasterSalvo: vi.fn(() => true),
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
    expect(fixture.nativeElement.querySelector('.eq-bands + .effect-actions')).not.toBeNull();
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

  it('shows rack-wide save and bypass plus per-module save and reset actions', () => {
    const rackButtons = fixture.nativeElement.querySelectorAll('.rack-actions button') as NodeListOf<HTMLButtonElement>;
    const moduleButtons = fixture.nativeElement.querySelectorAll('.effect-actions button') as NodeListOf<HTMLButtonElement>;

    expect(Array.from(rackButtons).map(button => button.textContent.trim()))
      .toEqual(['Salvar', 'Usar salvo', 'Desligar efeitos']);
    expect(moduleButtons).toHaveLength(4);
    rackButtons[0].click();
    rackButtons[1].click();
    rackButtons[2].click();
    moduleButtons[0].click();
    moduleButtons[1].click();
    moduleButtons[2].click();
    moduleButtons[3].click();

    expect(audio.salvarEfeitosMaster).toHaveBeenCalledOnce();
    expect(audio.usarEfeitosMasterSalvos).toHaveBeenCalledOnce();
    expect(audio.alternarBypassEfeitosMaster).toHaveBeenCalledOnce();
    expect(audio.resetarEqMaster).toHaveBeenCalledOnce();
    expect(audio.usarEqMasterSalvo).toHaveBeenCalledOnce();
    expect(audio.resetarMaximizerMaster).toHaveBeenCalledOnce();
    expect(audio.usarMaximizerMasterSalvo).toHaveBeenCalledOnce();
  });

  it('closes from the dialog close button', () => {
    (fixture.nativeElement.querySelector('.close-button') as HTMLButtonElement).click();

    expect(dialogRef.close).toHaveBeenCalledOnce();
  });
});