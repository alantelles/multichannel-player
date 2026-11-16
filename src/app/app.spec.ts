import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { App } from './app';
import { SobreDialogComponent } from './components/sobre-dialog/sobre-dialog.component';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])],
    })
      .overrideProvider(MatDialog, { useValue: { open: vi.fn() } })
      .compileComponents();
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

  it('opens the about dialog from navigation', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const button = compiled.querySelector<HTMLButtonElement>('.about-button');

    button?.click();

    expect(TestBed.inject(MatDialog).open).toHaveBeenCalledWith(
      SobreDialogComponent,
      expect.objectContaining({ ariaLabelledBy: 'about-title' }),
    );
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

  it('closes the mobile navigation when clicking outside it', () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true })));
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    app['menuAberto'].set(true);
    const outsideTarget = document.createElement('main');

    app['fecharMenuAoClicarFora']({ target: outsideTarget } as unknown as MouseEvent);

    expect(app['menuAberto']()).toBe(false);
    vi.unstubAllGlobals();
  });
});
