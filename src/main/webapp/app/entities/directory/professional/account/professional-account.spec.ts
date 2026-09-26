import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProfessionalAccount } from './professional-account';

describe('ProfessionalAccount', () => {
  let component: ProfessionalAccount;
  let fixture: ComponentFixture<ProfessionalAccount>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfessionalAccount],
    }).compileComponents();

    fixture = TestBed.createComponent(ProfessionalAccount);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
