import { beforeEach, describe, expect, it } from 'vitest';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { faBoxArchive, faCalendarAlt, faEye, faPencilAlt, faSort, faStar, faSync, faUserDoctor } from '@fortawesome/free-solid-svg-icons';
import { provideTranslateService } from '@ngx-translate/core';

import { ProfessionalDashboardComponent } from './professional-dashboard';

describe('ProfessionalDashboard', () => {
  let httpMock: HttpTestingController;
  let component: ProfessionalDashboardComponent;
  let fixture: ComponentFixture<ProfessionalDashboardComponent>;

  /**
   * Answer both children's own requests.
   *
   * This component embeds the account list and the profile list, so creating the fixture issues two
   * requests it does not make itself — `/api/admin/users` through HttpClient and `/api/profiles`
   * through `httpResource`. Matched by URL rather than with a bare `expectOne({ method: 'GET' })`,
   * because there are two of them and either may be absent on a given tick.
   */
  function flushChildren(): void {
    for (const req of httpMock.match(r => r.url.includes('/api/admin/users'))) {
      req.flush([], { headers: { 'X-Total-Count': '0' } });
    }
    for (const req of httpMock.match(r => r.url.includes('/api/profiles'))) {
      req.flush([]);
    }
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfessionalDashboardComponent],
      // HttpClient is not optional here and was not needed before: both children fetch in
      // `ngOnInit`. Without it the fixture cannot be created at all.
      providers: [provideRouter([]), provideTranslateService(), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    // Every icon reachable from this template OR from either child's, because a missing icon in
    // @fortawesome/angular-fontawesome THROWS rather than rendering nothing
    // (angular-fontawesome.mjs: "Could not find icon with iconName=…"). `faStar` was absent from the
    // application's own registry too until this change — see app/config/font-awesome-icons.ts.
    const library = TestBed.inject(FaIconLibrary);
    library.addIcons(faUserDoctor, faCalendarAlt, faSync, faBoxArchive, faStar, faSort, faEye, faPencilAlt);

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ProfessionalDashboardComponent);
    component = fixture.componentInstance;

    // ⚠ Deliberately NOT `await fixture.whenStable()`. Both children leave a request outstanding, so
    // the pending-task barrier never clears and every hook in this file timed out at 10s — four
    // failures all reporting "Hook timed out", none of them about what they assert. `TestBed.tick()`
    // lets the resource issue its request; `flushChildren` answers both. Same shape as
    // service-plan.spec.ts.
    fixture.detectChanges();
    TestBed.tick();
    flushChildren();
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  /**
   * The regression this screen actually shipped: `imports: [RouterLink]` plus
   * `schemas: [CUSTOM_ELEMENTS_SCHEMA]` left both children as unknown elements, so the two cards
   * rendered empty while the build stayed green and `should create` above kept passing.
   *
   * Asserting the children's own markup rather than the custom-element tags is the whole point — an
   * unresolved `<abf-professional-account>` is still present in the DOM as an inert element, so a
   * query for the tag alone passes in exactly the broken case. The inner assertions can only pass if
   * the components were declared, instantiated and rendered.
   */
  it('renders both children, not inert custom elements', () => {
    const host: HTMLElement = fixture.nativeElement;

    // The account list renders no table until it has rows, but its own alert outlets are
    // unconditional — and they exist only if the component itself was resolved.
    const accountHost = host.querySelector('abf-professional-account');
    expect(accountHost).toBeTruthy();
    expect(accountHost!.querySelector('abf-alert')).toBeTruthy();

    // The profile list renders its "no profiles" branch on an empty response, so it has content.
    const profileHost = host.querySelector('abf-professional-profile');
    expect(profileHost).toBeTruthy();
    expect(profileHost!.querySelector('#no-result')).toBeTruthy();
  });

  /** A missing `FontAwesomeModule` drops every icon silently; a missing icon definition throws. */
  it('renders its own icons', () => {
    expect(fixture.nativeElement.querySelectorAll('fa-icon svg').length).toBeGreaterThanOrEqual(2);
  });

  /**
   * The dashboard must not render an alert pair of its own: both children carry one, and a third
   * copy here showed every alert three times over.
   */
  it('leaves the alert outlets to the children', () => {
    const host: HTMLElement = fixture.nativeElement;
    const ownAlerts = Array.from(host.querySelectorAll('abf-alert')).filter(
      el => !el.closest('abf-professional-account') && !el.closest('abf-professional-profile'),
    );
    expect(ownAlerts).toHaveLength(0);
  });
});
