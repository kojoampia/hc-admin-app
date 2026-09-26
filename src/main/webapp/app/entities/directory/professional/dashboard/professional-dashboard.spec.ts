import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ProfessionalDashboard } from './professional-dashboard';
import { provideTranslateService } from '@ngx-translate/core';

describe('ProfessionalDashboard', () => {
  let component: ProfessionalDashboard;
  let fixture: ComponentFixture<ProfessionalDashboard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfessionalDashboard],
      providers: [provideRouter([]), provideTranslateService()],
    }).compileComponents();

    fixture = TestBed.createComponent(ProfessionalDashboard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
