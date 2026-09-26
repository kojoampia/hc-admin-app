import { TestBed } from '@angular/core/testing';

import { ProfessionalAccountService } from './professional-account.service';

describe('ProfessionalAccountService', () => {
  let service: ProfessionalAccountService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ProfessionalAccountService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
