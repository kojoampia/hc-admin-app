import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { ProfessionalAccount } from './professional-account';

describe('ProfessionalAccount', () => {
  let component: ProfessionalAccount;
  let fixture: ComponentFixture<ProfessionalAccount>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfessionalAccount],
      providers: [provideRouter([]), { provide: TranslateService, useValue: {} }],
    }).compileComponents();

    fixture = TestBed.createComponent(ProfessionalAccount);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
