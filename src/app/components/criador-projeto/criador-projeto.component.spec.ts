import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CriadorProjetoComponent } from './criador-projeto.component';

describe('CriadorProjetoComponent', () => {
  let component: CriadorProjetoComponent;
  let fixture: ComponentFixture<CriadorProjetoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CriadorProjetoComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CriadorProjetoComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
