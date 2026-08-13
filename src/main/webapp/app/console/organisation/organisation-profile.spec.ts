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
import { AddressService } from 'app/entities/directory/address/service/address.service';

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
  let addressService: { create: any; update: any };

  const anOrganisation = {
    id: 'org-1',
    name: 'Abofonsa BridgeCare',
    legalName: 'Abofonsa BridgeCare Ltd',
    foundedOn: dayjs('2019-06-01'),
    address: {
      id: 'addr-1',
      digitalAddress: 'GA-123-4567',
      streetAddress: '12 Independence Ave',
      cityState: 'Accra',
      region: 'Greater Accra',
      country: 'Ghana',
    },
  };

  /** The two fields the api marks @NotNull. Every save has to carry them. */
  const requiredFields = { name: 'Abofonsa BridgeCare', legalName: 'Abofonsa BridgeCare Ltd' };

  /** Five of the six address fields are @NotNull, and the digital address is patterned. */
  const aCompleteAddress = {
    digitalAddress: 'GA-123-4567',
    streetAddress: '1 Test St',
    cityState: 'Accra',
    region: 'Greater Accra',
    country: 'Ghana',
  };

  function setUp(authorities: string[], existing: any = null): OrganisationProfile {
    organisationService = {
      query: vitest.fn().mockReturnValue(of({ body: existing ? [existing] : [] })),
      create: vitest.fn().mockImplementation((org: any) => of({ ...org, id: 'new-org' })),
      update: vitest.fn().mockImplementation((org: any) => of(org)),
    };
    addressService = {
      create: vitest.fn().mockImplementation((a: any) => of({ ...a, id: 'new-addr' })),
      update: vitest.fn().mockImplementation((a: any) => of(a)),
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
        { provide: AddressService, useValue: addressService },
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
    component.form.patchValue({ ...requiredFields, email: 'desk@abofonsa.care' });
    component.save();

    expect(organisationService.create).toHaveBeenCalled();
    expect(organisationService.update).not.toHaveBeenCalled();
    expect(organisationService.create.mock.calls[0][0].id).toBeNull();
  });

  it('updates when a record exists', () => {
    const component = setUp(['ROLE_ADMIN'], anOrganisation);
    expect(component.creating()).toBe(false);

    component.startEditing();
    component.form.patchValue({ ...requiredFields, name: 'Renamed' });
    component.save();

    expect(organisationService.update).toHaveBeenCalled();
    expect(organisationService.create).not.toHaveBeenCalled();
    expect(organisationService.update.mock.calls[0][0].id).toEqual('org-1');
  });

  /**
   * Organisation.address is a @DBRef, so the address must exist as its own record before the
   * organisation can point at it. Sending one inline fails with "Cannot create a reference to an
   * object with a NULL id" — a 500, not a validation error, and one that only shows up against a
   * real server.
   */
  it('updates the existing address record rather than inlining it', () => {
    const component = setUp(['ROLE_ADMIN'], anOrganisation);

    component.startEditing();
    component.form.patchValue({ digitalAddress: 'GA-999-0000' });
    component.save();

    expect(addressService.update).toHaveBeenCalled();
    expect(addressService.update.mock.calls[0][0].id).toEqual('addr-1');
    expect(organisationService.update.mock.calls[0][0].address.id).toEqual('addr-1');
  });

  it('creates the address first when there is none, then references it', () => {
    const component = setUp(['ROLE_ADMIN']);

    component.startEditing();
    component.form.patchValue({ ...requiredFields, ...aCompleteAddress });
    component.save();

    expect(addressService.create).toHaveBeenCalled();
    expect(addressService.create.mock.calls[0][0].id).toBeNull();
    // The organisation carries the stored reference, not the form values.
    expect(organisationService.create.mock.calls[0][0].address.id).toEqual('new-addr');
  });

  /**
   * The bug this suite did not have. The form allowed a save with no legal entity, the api rejects
   * it with `error.validation`, and the user saw a failure they had been given no way to avoid.
   */
  it('will not save without the fields the api requires', () => {
    const component = setUp(['ROLE_ADMIN']);

    component.startEditing();
    component.form.patchValue({ name: 'Named but not incorporated' });
    component.save();

    expect(component.form.invalid).toBe(true);
    expect(organisationService.create).not.toHaveBeenCalled();
  });

  /**
   * Four of the address's fields are @NotNull, so a half-filled one is rejected by the api. Catching
   * it here means the message can say which fields go together, rather than surfacing a 400.
   */
  it('will not save a half-filled address', () => {
    const component = setUp(['ROLE_ADMIN']);

    component.startEditing();
    component.form.patchValue({ ...requiredFields, digitalAddress: 'GA-123-4567' });
    component.save();

    expect(component.form.errors?.['addressIncomplete']).toBeTruthy();
    expect(organisationService.create).not.toHaveBeenCalled();
  });

  /**
   * The failure that reached production. `digitalAddress` carries a @Pattern the form did not
   * mirror, so a plausible-looking value was accepted here and rejected by the api with a bare
   * regex — a message that tells the person filling the form nothing at all.
   */
  it('rejects a digital address that is not Ghana Post GPS', () => {
    const component = setUp(['ROLE_ADMIN']);

    component.startEditing();
    component.form.patchValue({ ...requiredFields, ...aCompleteAddress, digitalAddress: '12 Independence Ave' });
    component.save();

    expect(component.form.get('digitalAddress')?.errors?.['pattern']).toBeTruthy();
    expect(addressService.create).not.toHaveBeenCalled();
  });

  it('accepts a correctly formatted digital address', () => {
    const component = setUp(['ROLE_ADMIN']);

    component.startEditing();
    component.form.patchValue({ ...requiredFields, ...aCompleteAddress });
    component.save();

    expect(addressService.create).toHaveBeenCalled();
  });

  /** An address needs its digital address too — it is @NotNull, which the first attempt missed. */
  it('will not save an address without a digital address', () => {
    const component = setUp(['ROLE_ADMIN']);

    component.startEditing();
    component.form.patchValue({ ...requiredFields, streetAddress: '1 Test St', cityState: 'Accra', region: 'GA', country: 'Ghana' });
    component.save();

    expect(component.form.errors?.['addressIncomplete']).toContain('digitalAddress');
    expect(addressService.create).not.toHaveBeenCalled();
  });

  /** An organisation with no address at all must not be given an empty one. */
  it('sends no address when every address field is blank', () => {
    const component = setUp(['ROLE_ADMIN']);

    component.startEditing();
    component.form.patchValue({ ...requiredFields, name: 'Named only' });
    component.save();

    expect(organisationService.create.mock.calls[0][0].address).toBeNull();
  });
});
