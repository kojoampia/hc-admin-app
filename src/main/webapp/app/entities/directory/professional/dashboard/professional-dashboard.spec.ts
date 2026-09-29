import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ProfessionalDashboard } from './professional-dashboard';
import { provideTranslateService } from '@ngx-translate/core';
import { FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { faUserDoctor, faCalendarAlt, faSync, faBoxArchive } from '@fortawesome/free-solid-svg-icons';

describe('ProfessionalDashboard', () => {
  let component: ProfessionalDashboard;
  let fixture: ComponentFixture<ProfessionalDashboard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfessionalDashboard],
      providers: [provideRouter([]), provideTranslateService()],
    }).compileComponents();

    const library = TestBed.inject(FaIconLibrary);
    library.addIcons(faUserDoctor);
    library.addIcons(faCalendarAlt);
    library.addIcons(faSync);
    library.addIcons(faBoxArchive);

    fixture = TestBed.createComponent(ProfessionalDashboard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
