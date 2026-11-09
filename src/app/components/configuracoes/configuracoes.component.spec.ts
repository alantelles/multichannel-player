import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EventEmitter, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { provideRouter } from '@angular/router';
import { LatencySettingsService } from '../../services/latency-settings.service';
import { FileRepositoryService } from '../../services/file-repository.service';
import { ConfiguracoesComponent } from './configuracoes.component';

describe('ConfiguracoesComponent', () => {
  let component: ConfiguracoesComponent;
  let fixture: ComponentFixture<ConfiguracoesComponent>;
  const latencySettings = {
    selectedProfileKey: signal('safe'),
    customLookaheadMs: signal(300),
    offsetMs: signal(0),
    setProfile: vi.fn(),
    setCustomLookahead: vi.fn(),
    setOffsetMs: vi.fn(),
  };
  const fileRepository = {
    onlineRepositoryUrl: signal('audios/'),
    saveFiles: vi.fn().mockResolvedValue(undefined),
  };
  const audioDialogComponent = {
    aoFechar: new EventEmitter<void>(),
    aoConfirmar: new EventEmitter<{ pastaBase: string; arquivos: File[] }>(),
  };
  const dialogRef = { componentInstance: audioDialogComponent, close: vi.fn() };

  beforeEach(async () => {
    vi.clearAllMocks();
    fileRepository.onlineRepositoryUrl.set('audios/');
    await TestBed.configureTestingModule({
      imports: [ConfiguracoesComponent],
      providers: [
        provideRouter([]),
        { provide: LatencySettingsService, useValue: latencySettings },
        { provide: FileRepositoryService, useValue: fileRepository },
      ],
    }).compileComponents();

    vi.spyOn(MatDialog.prototype, 'open').mockReturnValue(dialogRef as never);
    fixture = TestBed.createComponent(ConfiguracoesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    localStorage.removeItem('audioRepository');
    TestBed.resetTestingModule();
  });

  it('renders latency and repository settings on the page', () => {
    const text = fixture.nativeElement.textContent as string;

    expect(text).toContain('Latência e performance');
    expect(text).toContain('Repositórios de áudio');
    expect(fixture.nativeElement.querySelector('#remote-repository')).not.toBeNull();
  });

  it('persists the selected latency profile and hardware offset', () => {
    component.selecionarPerfil('low');
    component.offsetMs.set(24);

    component.salvarLatencia();

    expect(latencySettings.setProfile).toHaveBeenCalledWith('low');
    expect(latencySettings.setOffsetMs).toHaveBeenCalledWith(24);
  });

  it('persists remote repository changes immediately', () => {
    component.salvarRepositorioRemoto('https://cdn.example.test/audio/');

    expect(fileRepository.onlineRepositoryUrl()).toBe('https://cdn.example.test/audio/');
    expect(localStorage.getItem('audioRepository')).toBe('https://cdn.example.test/audio/');
  });

  it('saves selected audio files to the local repository', async () => {
    const audioFile = new File(['audio'], 'kick.wav', { type: 'audio/wav' });
    component.abrirDialogoAudiosLocais();
    audioDialogComponent.aoConfirmar.emit({ pastaBase: 'ensaio', arquivos: [audioFile] });

    expect(MatDialog.prototype.open).toHaveBeenCalled();
    await vi.waitFor(() => expect(fileRepository.saveFiles).toHaveBeenCalledWith('ensaio', [audioFile]));

    expect(dialogRef.close).toHaveBeenCalled();
    expect(component.status()).toContain('1 áudio(s) adicionado(s)');
  });
});