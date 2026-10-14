import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SelecionarProjetoDialogComponent } from './selecionar-projeto-dialog.component';

describe('SelecionarProjetoDialogComponent', () => {
  let component: SelecionarProjetoDialogComponent;
  let fixture: ComponentFixture<SelecionarProjetoDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SelecionarProjetoDialogComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SelecionarProjetoDialogComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
