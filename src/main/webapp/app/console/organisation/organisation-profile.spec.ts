import { beforeEach, describe, expect, it, vitest } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { faEye, faPencilAlt } from '@fortawesome/free-solid-svg-icons';
import { of } from 'rxjs';
import dayjs from 'dayjs/esm';

import OrganisationProfile from './organisation-profile';
import { AccountService } from 'app/core/auth/account.service';
import { OrganisationService } from 'app/entities/platform/organisation/service/organisation.service';
import { TeamService } from 'app/entities/platform/team/service/team.service';
import { AuditEntryService } from 'app/entities/platform/audit-entry/service/audit-entry.service';
import { ProfessionalNamesService } from '../shared/professional-names.service';

/**
 * Editing the organisation record.
 *
 * The screen was read-only, so the record could only ever arrive from a seed profile — and
 * production seeds nothing, which is why it showed an empty page. Three behaviours decide whether
 * the editing that replaces that is correct.
 */
describe('OrganisationProfile editing', () => {
  let organisationService: { query: any; create: any; update: any };
  let accountService: { account: any; hasAnyAuthority: any; identity: any };

  const anOrganisation = {
    id: 'org-1',
    name: 'Abofonsa BridgeCare',
    foundedOn: dayjs('2019-06-01'),
    address: { id: 'addr-1', digitalAddress: 'GA-123-4567' },
  };

  function setUp(authorities: string[], existing: any = null): OrganisationProfile {
    organisationService = {
      query: vitest.fn().mockReturnValue(of({ body: existing ? [existing] : [] })),
      create: vitest.fn().mockImplementation((org: any) => of({ ...org, id: 'new-org' })),
      update: vitest.fn().mockImplementation((org: any) => of(org)),
    };
    accountService = {
      account: () => ({ authorities }),
      hasAnyAuthority: (needed: string | string[]) => (Array.isArray(needed) ? needed : [needed]).some(a => authorities.includes(a)),
      identity: () => of(null),
    };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideTranslateService(),
        { provide: OrganisationService, useValue: organisationService },
        { provide: AccountService, useValue: accountService },
        { provide: TeamService, useValue: { query: () => of({ body: [] }) } },
        { provide: AuditEntryService, useValue: { query: () => of({ body: [] }) } },
        { provide: ProfessionalNamesService, useValue: { load: () => undefined, nameFor: () => '' } },
      ],
    });

    // The template renders icons, and the library is loaded by main.ts in the real application
    // rather than by TestBed. Without this the admin cases fail on a missing icon while the
    // operator case passes, because the button carrying it is gated away.
    const library = TestBed.inject(FaIconLibrary);
    library.addIcons(faPencilAlt, faEye);

    const fixture = TestBed.createComponent(OrganisationProfile);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  /**
   * Operators can read the whole entity surface and write none of it — the api gives them GET only.
   * Offering them a form whose save comes back 403 would be worse than offering none.
   */
  it('does not offer editing to an operator', () => {
    const component = setUp(['ROLE_OPERATOR']);
    expect(component.canEdit()).toBe(false);
  });

  it('offers editing to an administrator', () => {
    const component = setUp(['ROLE_ADMIN']);
    expect(component.canEdit()).toBe(true);
  });

  /**
   * The live path. Production holds no organisation, so the first save must create rather than
   * attempt an update against a record that is not there.
   */
  it('creates when there is no record yet', () => {
    const component = setUp(['ROLE_ADMIN']);
    expect(component.creating()).toBe(true);

    component.startEditing();
    component.form.patchValue({ name: 'Abofonsa BridgeCare', email: 'desk@abofonsa.care' });
    component.save();

    expect(organisationService.create).toHaveBeenCalled();
    expect(organisationService.update).not.toHaveBeenCalled();
    expect(organisationService.create.mock.calls[0][0].id).toBeNull();
  });

  it('updates when a record exists', () => {
    const component = setUp(['ROLE_ADMIN'], anOrganisation);
    expect(component.creating()).toBe(false);

    component.startEditing();
    component.form.patchValue({ name: 'Renamed' });
    component.save();

    expect(organisationService.update).toHaveBeenCalled();
    expect(organisationService.create).not.toHaveBeenCalled();
    expect(organisationService.update.mock.calls[0][0].id).toEqual('org-1');
  });

  /**
   * The address is embedded in the organisation document rather than referenced. Carrying its id
   * through is what stops a save from orphaning the stored address and writing a second one.
   */
  it('keeps the existing address id when saving', () => {
    const component = setUp(['ROLE_ADMIN'], anOrganisation);

    component.startEditing();
    component.form.patchValue({ digitalAddress: 'GA-999-0000' });
    component.save();

    expect(organisationService.update.mock.calls[0][0].address.id).toEqual('addr-1');
  });

  /** An organisation with no address at all must not be given an empty one. */
  it('sends no address when every address field is blank', () => {
    const component = setUp(['ROLE_ADMIN']);

    component.startEditing();
    component.form.patchValue({ name: 'Named only' });
    component.save();

    expect(organisationService.create.mock.calls[0][0].address).toBeNull();
  });
});
