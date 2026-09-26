import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { ProfessionalProfile } from './professional-profile';

describe('ProfessionalProfile', () => {
  let component: ProfessionalProfile;
  let fixture: ComponentFixture<ProfessionalProfile>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfessionalProfile],
      providers: [provideRouter([]), { provide: TranslateService, useValue: {} }],
    }).compileComponents();

    fixture = TestBed.createComponent(ProfessionalProfile);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
