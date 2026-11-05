import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LatencyModalComponent } from './latency-modal.component';



describe('LatencyModalComponent', () => {
  let component: LatencyModalComponent;
  let fixture: ComponentFixture<LatencyModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LatencyModalComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(LatencyModalComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
