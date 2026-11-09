import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';
import { ConfirmacaoDialogComponent } from '../components/confirmacao-dialog/confirmacao-dialog.component';
import { ConfirmacaoDialogService } from './confirmacao-dialog.service';

describe('ConfirmacaoDialogService', () => {
  const dialog = {
    open: vi.fn().mockReturnValue({ afterClosed: () => of(true) }),
  };
  let service: ConfirmacaoDialogService;

  beforeEach(() => {
    vi.clearAllMocks();
    dialog.open.mockReturnValue({ afterClosed: () => of(true) });
    TestBed.configureTestingModule({ providers: [{ provide: MatDialog, useValue: dialog }] });
    service = TestBed.inject(ConfirmacaoDialogService);
  });

  afterEach(() => TestBed.resetTestingModule());

  it('opens the generic dialog with defaults and custom options', async () => {
    const options = {
      titulo: 'Excluir projeto?',
      mensagem: 'Esta ação não pode ser desfeita.',
      textoConfirmacao: 'Excluir',
      aparencia: 'perigo' as const,
    };

    await expect(service.confirmar(options)).resolves.toBe(true);

    expect(dialog.open).toHaveBeenCalledWith(
      ConfirmacaoDialogComponent,
      expect.objectContaining({
        data: {
          ...options,
          textoCancelamento: 'Cancelar',
        },
        role: 'alertdialog',
      }),
    );
  });

  it('treats a dialog dismissal as cancellation', async () => {
    dialog.open.mockReturnValue({ afterClosed: () => of(undefined) });

    await expect(service.confirmar({ titulo: 'Confirmar', mensagem: 'Continuar?' })).resolves.toBe(false);
  });
});