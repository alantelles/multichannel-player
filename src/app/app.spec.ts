import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render navigation to the app pages', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const links = Array.from(compiled.querySelectorAll('nav a')).map(link => link.textContent?.trim());

    expect(links).toEqual(['Mixer', 'Criar projeto', 'Admin de projetos', 'Configurações']);
  });

  it('should toggle inverted page mode from navigation', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const button = compiled.querySelector<HTMLButtonElement>('.page-inversion-toggle');
    const menuToggle = compiled.querySelector<HTMLButtonElement>('.menu-toggle');
    const navigation = compiled.querySelector('nav');

    expect(button).not.toBeNull();
    menuToggle?.click();
    fixture.detectChanges();
    expect(navigation?.classList.contains('is-open')).toBe(true);

    button?.click();
    fixture.detectChanges();

    expect(compiled.querySelector('.app-container')?.classList.contains('is-inverted')).toBe(true);
    expect(button?.getAttribute('aria-pressed')).toBe('true');
    expect(document.querySelector('.cdk-overlay-container')?.classList.contains('is-inverted')).toBe(true);
    expect(navigation?.classList.contains('is-open')).toBe(false);
  });
});
