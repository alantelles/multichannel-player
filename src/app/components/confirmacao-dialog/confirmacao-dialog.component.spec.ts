import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ConfirmacaoDialogComponent, ConfirmacaoDialogData } from './confirmacao-dialog.component';

describe('ConfirmacaoDialogComponent', () => {
  let component: ConfirmacaoDialogComponent;
  let fixture: ComponentFixture<ConfirmacaoDialogComponent>;
  const data: ConfirmacaoDialogData = {
    titulo: 'Interromper reprodução?',
    mensagem: 'O áudio será interrompido.',
    textoConfirmacao: 'Parar e sair',
    textoCancelamento: 'Continuar tocando',
    aparencia: 'perigo',
  };
  const dialogRef = { close: vi.fn() };

  beforeEach(async () => {
    vi.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [ConfirmacaoDialogComponent],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: data },
        { provide: MatDialogRef, useValue: dialogRef },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ConfirmacaoDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders the supplied confirmation content and labels', () => {
    const text = fixture.nativeElement.textContent as string;

    expect(text).toContain(data.titulo);
    expect(text).toContain(data.mensagem);
    expect(text).toContain(data.textoConfirmacao);
    expect(text).toContain(data.textoCancelamento);
    expect(fixture.nativeElement.querySelector('.danger-button')).not.toBeNull();
  });

  it('closes with false when canceled', () => {
    component.cancelar();

    expect(dialogRef.close).toHaveBeenCalledWith(false);
  });

  it('closes with true when confirmed', () => {
    component.confirmar();

    expect(dialogRef.close).toHaveBeenCalledWith(true);
  });
});