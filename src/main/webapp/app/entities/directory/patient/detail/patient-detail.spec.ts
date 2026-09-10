import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vitest } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { FaIconLibrary } from '@fortawesome/angular-fontawesome';
import {
  faArrowLeft,
  faBoxArchive,
  faBoxOpen,
  faCheck,
  faClipboardCheck,
  faCreditCard,
  faHeart,
  faLocationDot,
  faPencilAlt,
  faShieldHalved,
  faStethoscope,
  faUser,
} from '@fortawesome/free-solid-svg-icons';
import { provideTranslateService } from '@ngx-translate/core';
import dayjs from 'dayjs/esm';
import { of, throwError } from 'rxjs';

import { DirectoryLinkService } from 'app/entities/directory/directory-link/service/directory-link.service';
import { ProfessionalService } from 'app/entities/directory/professional/service/professional.service';
import { PatientService } from '../service/patient.service';
import { PatientDetail } from './patient-detail';

describe('Patient Management Detail Component', () => {
  let comp: PatientDetail;
  let fixture: ComponentFixture<PatientDetail>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideTranslateService(),
        provideRouter(
          [
            {
              path: '**',
              loadComponent: () => import('./patient-detail').then(m => m.PatientDetail),
              resolve: { patient: () => of({ id: '88928db1-656e-430d-95c0-5cde75285e55' }) },
            },
          ],
          withComponentInputBinding(),
        ),
      ],
    });
    const library = TestBed.inject(FaIconLibrary);
    library.addIcons(faArrowLeft);
    library.addIcons(faPencilAlt);
    library.addIcons(faBoxArchive);
    library.addIcons(faBoxOpen);
    // The six card icons. A record that renders every field and throws on an icon is still broken.
    library.addIcons(faUser, faLocationDot, faShieldHalved, faHeart, faCreditCard, faStethoscope);
    // The plan-choice card and its decision button (item 54). Registered here because
    // `font-awesome-icons.ts` is the application's library and this harness builds its own.
    library.addIcons(faClipboardCheck, faCheck);
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PatientDetail);
    comp = fixture.componentInstance;
  });

  describe('OnInit', () => {
    it('should load patient on init', async () => {
      const harness = await RouterTestingHarness.create();
      const instance = await harness.navigateByUrl('/', PatientDetail);

      // THEN
      expect(instance.patient()).toEqual(expect.objectContaining({ id: '88928db1-656e-430d-95c0-5cde75285e55' }));
    });
  });

  describe('PreviousState', () => {
    it('should navigate to previous state', () => {
      vitest.spyOn(globalThis.history, 'back');
      comp.previousState();
      expect(globalThis.history.back).toHaveBeenCalled();
    });
  });

  describe('The record header', () => {
    it('should build initials from the profile, not the id', () => {
      fixture.componentRef.setInput('patient', { id: 'a1', profile: { firstName: 'Kojo', lastName: 'Ampia-Addison' } });
      expect(comp.initials()).toBe('KA');
      expect(comp.fullName()).toBe('Kojo Ampia-Addison');
    });

    /**
     * Backlog item 45, and the reversal of what this case used to assert.
     *
     * It read "should fall back to the id when there is no profile" and expected `A1` — the id's
     * first two characters. On a real record that id is a 24-character Mongo ObjectId, so the chip
     * said `68` above a heading reading `68b4f2a19c3d5e7f81a02c44`, and an operator reported it
     * from production as a corrupted record. A patient learned from a sibling domain event has no
     * profile and can never be given one from the wire, so this is not a rare state — it is every
     * patient who registers.
     */
    it('should never build initials or a heading out of the record id', () => {
      fixture.componentRef.setInput('patient', { id: '68b4f2a19c3d5e7f81a02c44' });

      expect(comp.initials()).not.toBe('68');
      expect(comp.initials()).toBe('—');
      expect(comp.fullName()).toBeNull();
      expect(comp.headingName()).toBeNull();
    });

    it('should head the record with the linked address when there is no profile', () => {
      fixture.componentRef.setInput('patient', { id: '68b4f2a19c3d5e7f81a02c44' });
      comp.resolvedLinkIdentity.set({ id: '68b4f2a19c3d5e7f81a02c44', identity: 'ama.mensah@example.com' });

      expect(comp.headingName()).toBe('ama.mensah@example.com');
      expect(comp.initials()).toBe('AM');
    });

    it('should prefer a real name over the linked address', () => {
      fixture.componentRef.setInput('patient', { id: 'a1', profile: { firstName: 'Kojo', lastName: 'Ampia-Addison' } });
      comp.resolvedLinkIdentity.set({ id: 'a1', identity: 'ama.mensah@example.com' });

      expect(comp.headingName()).toBe('Kojo Ampia-Addison');
      expect(comp.initials()).toBe('KA');
    });

    /**
     * **One patient's email address must not print on another patient's record.**
     *
     * `/patient/A/view` → `/patient/B/view` reuses this component instance, because the two routes
     * share a `routeConfig` and Angular does not recreate it. So both effects re-run against B while
     * A's `findByLocalIds` may still be in flight, and an unkeyed signal takes whichever response
     * lands last. Until 2026-09-07 that was exactly the shape here, and the heading is the one place
     * on the screen where showing the wrong person's contact address is not a cosmetic fault.
     *
     * The record already solved this fifty lines up — `archivedOverride` carries `{ id, isArchived }`
     * so a stale override is ignored rather than claiming the new record's state — and this is that
     * pattern applied to the other two resolved values.
     */
    it('should ignore a linked identity that belongs to a record no longer on screen', () => {
      fixture.componentRef.setInput('patient', { id: 'patient-b' });
      comp.resolvedLinkIdentity.set({ id: 'patient-a', identity: 'ama.mensah@example.com' });

      expect(comp.linkIdentity()).toBeNull();
      expect(comp.headingName()).toBeNull();
      expect(comp.initials()).toBe('—');
    });

    it('should include a middle name in the full name but not the initials', () => {
      fixture.componentRef.setInput('patient', { id: 'a1', profile: { firstName: 'Kojo', middleName: 'Kwesi', lastName: 'Addison' } });
      expect(comp.fullName()).toBe('Kojo Kwesi Addison');
      expect(comp.initials()).toBe('KA');
    });
  });

  describe('Age', () => {
    it('should derive whole years from the date of birth', () => {
      const born = dayjs().subtract(50, 'year').subtract(3, 'month');
      fixture.componentRef.setInput('patient', { id: 'a1', profile: { dateOfBirth: born } });
      expect(comp.age()).toBe(50);
    });

    /**
     * PatientService converts joinedOn and lastActiveOn and nothing else, so the nested profile's
     * dateOfBirth arrives as a string while its type says dayjs. Piping that straight into
     * formatMediumDate threw `day.format is not a function` on a record that otherwise rendered.
     */
    it('should accept a nested date of birth that arrives as a string', () => {
      fixture.componentRef.setInput('patient', { id: 'a1', profile: { dateOfBirth: '1976-04-19' as any } });
      expect(comp.dateOfBirth()?.format('YYYY-MM-DD')).toBe('1976-04-19');
      expect(comp.age()).toBeGreaterThan(40);
    });

    it('should be null when the date of birth cannot be parsed', () => {
      fixture.componentRef.setInput('patient', { id: 'a1', profile: { dateOfBirth: 'not-a-date' as any } });
      expect(comp.dateOfBirth()).toBeNull();
      expect(comp.age()).toBeNull();
    });

    it('should be null when there is no date of birth', () => {
      fixture.componentRef.setInput('patient', { id: 'a1', profile: {} });
      expect(comp.age()).toBeNull();
    });
  });

  /**
   * The patient payload nests the profile, address, angel, plan and hub, but `clinicalLead` arrives
   * without a profile of its own — so it carries a licence number and no name. The record fetches
   * the professional for it, and must degrade to the licence number rather than to nothing.
   */
  describe('Clinical lead', () => {
    it('should fetch the name the patient payload does not carry', () => {
      const service = TestBed.inject(ProfessionalService);
      vitest.spyOn(service, 'find').mockReturnValue(of({ id: 'p1', profile: { firstName: 'Ama', lastName: 'Boateng' } }) as any);

      fixture.componentRef.setInput('patient', { id: 'a1', clinicalLead: { id: 'p1', licenceNumber: 'MDC/RN/23-4471' } });
      fixture.detectChanges();

      expect(service.find).toHaveBeenCalledWith('p1');
      expect(comp.clinicalLeadName()).toBe('Ama Boateng');
    });

    it('should leave the name null when the lookup fails', () => {
      const service = TestBed.inject(ProfessionalService);
      vitest.spyOn(service, 'find').mockReturnValue(throwError(() => new Error('nope')));

      fixture.componentRef.setInput('patient', { id: 'a1', clinicalLead: { id: 'p1', licenceNumber: 'MDC/RN/23-4471' } });
      fixture.detectChanges();

      expect(comp.clinicalLeadName()).toBeNull();
    });

    /**
     * The same stale-response window as the linked identity above, and it was pre-existing rather
     * than introduced by item 45 — fixed in the same pass because it is one bug in two places.
     * A clinician's name attached to the wrong patient reads as a real assignment.
     */
    it('should ignore a resolved name that belongs to a lead no longer on screen', () => {
      fixture.componentRef.setInput('patient', { id: 'a2', clinicalLead: { id: 'p2', licenceNumber: 'NMC/GH/19-8820' } });
      comp.resolvedLeadName.set({ leadId: 'p1', name: 'Ama Boateng' });

      expect(comp.clinicalLeadName()).toBeNull();
    });

    it('should not call the service when there is no lead', () => {
      const service = TestBed.inject(ProfessionalService);
      vitest.spyOn(service, 'find');

      fixture.componentRef.setInput('patient', { id: 'a1' });
      fixture.detectChanges();

      expect(service.find).not.toHaveBeenCalled();
    });

    /**
     * The link's text, which the template built with `?? lead.licenceNumber ?? lead.id` until
     * 2026-09-08 and which a blank licence number emptied.
     *
     * The annotation `@NotBlank` appears nowhere in the api's main sources, so `""` satisfies
     * `licenceNumber`'s `@NotNull @Size(max = 40)` and `??` let it through — an `<a>` with no text,
     * on a record that does have a clinical lead. Pre-existing, found by the review of backlog item
     * 49, and not item 45's defect: blank is not an id. Read out of the DOM rather than off the
     * computed, because the defect was in what the template did with a correct value — which is the
     * same way `professional-detail.html`'s heading hid.
     */
    it('never renders an empty clinical lead link when the licence number is blank', () => {
      const service = TestBed.inject(ProfessionalService);
      vitest.spyOn(service, 'find').mockReturnValue(of({ id: 'p1', profile: {} }) as any);

      fixture.componentRef.setInput('patient', { id: 'a1', clinicalLead: { id: 'p1', licenceNumber: '' } });
      fixture.detectChanges();

      expect(comp.clinicalLeadLabel()).toBe('—');
      const link: HTMLAnchorElement = fixture.nativeElement.querySelector('a[href="/professional/p1/view"]');
      expect(link).toBeTruthy();
      expect(link.textContent.trim()).toBe('—');
      expect(link.textContent.trim()).not.toBe('');
      expect(link.textContent).not.toContain('p1');
    });

    it('still prefers the resolved name, then a real licence number', () => {
      const service = TestBed.inject(ProfessionalService);
      vitest.spyOn(service, 'find').mockReturnValue(of({ id: 'p1', profile: { firstName: 'Ama', lastName: 'Boateng' } }) as any);

      fixture.componentRef.setInput('patient', { id: 'a1', clinicalLead: { id: 'p1', licenceNumber: 'MDC/RN/23-4471' } });
      fixture.detectChanges();
      expect(comp.clinicalLeadLabel()).toBe('Ama Boateng');

      comp.resolvedLeadName.set(null);
      expect(comp.clinicalLeadLabel()).toBe('MDC/RN/23-4471');
    });
  });

  describe('Archiving', () => {
    it('should PATCH only isArchived, never the whole record', () => {
      const service = TestBed.inject(PatientService);
      const setArchived = vitest.spyOn(service, 'setArchived').mockReturnValue(of({ id: 'a' }));
      fixture.componentRef.setInput('patient', { id: 'a', isArchived: false });

      comp.toggleArchived();

      expect(setArchived).toHaveBeenCalledWith(expect.objectContaining({ id: 'a' }), true);
      expect(comp.isArchived()).toBe(true);
    });

    it('should flip back to Archive when unarchiving', () => {
      const service = TestBed.inject(PatientService);
      vitest.spyOn(service, 'setArchived').mockReturnValue(of({ id: 'a' }));
      fixture.componentRef.setInput('patient', { id: 'a', isArchived: true });

      comp.toggleArchived();

      expect(comp.isArchived()).toBe(false);
    });

    // A failed write must not relabel the button: that would claim the record is
    // archived when the server still says it is not.
    it('should leave the flag alone when the write fails', () => {
      const service = TestBed.inject(PatientService);
      vitest.spyOn(service, 'setArchived').mockReturnValue(throwError(() => new Error('nope')));
      fixture.componentRef.setInput('patient', { id: 'a', isArchived: false });

      comp.toggleArchived();

      expect(comp.isArchived()).toBe(false);
      expect(comp.isSaving()).toBe(false);
    });
  });
  /**
   * Backlog item 54 — the decision that answers item 48's queue.
   *
   * The wire format hc-patient receives is the api's to prove; what these cases pin is that this
   * console asks for a DECISION rather than setting a status, that it does not claim an outcome it
   * cannot see, and that it never calls the act "activate".
   */
  describe('plan choice', () => {
    const CHOICE = {
      id: 'dl-a13',
      localId: 'a13',
      planCode: 'MELON',
      planName: 'MELON Plan',
      planStatus: 'PENDING',
      planMembershipId: 'mem-a13-0041',
    };

    function withLink(link: unknown): void {
      const links = TestBed.inject(DirectoryLinkService);
      vitest
        .spyOn(links, 'findByLocalIds')
        .mockReturnValue(of(new Map(link ? [[(link as { localId: string }).localId, link]] : [])) as never);
    }

    /**
     * A decision is POSTed, not a status toggled — the contract
     * `professional-detail.ts:291` records after this console removed exactly such a toggle on
     * 2026-08-24. The service is asked for the LINK's id, because the choice lives on the link and
     * not on the patient.
     */
    it('posts a decision naming the link, rather than patching a status', () => {
      withLink(CHOICE);
      const links = TestBed.inject(DirectoryLinkService);
      const verify = vitest.spyOn(links, 'verifyPlanChoice').mockReturnValue(of({ plan: 'MELON', membershipId: 'mem-a13-0041' }));

      fixture.componentRef.setInput('patient', { id: 'a13' });
      fixture.detectChanges();
      comp.verifyPlanChoice();

      expect(verify).toHaveBeenCalledWith('dl-a13');
    });

    /**
     * There is no way to un-verify and no way to set a status, and the absence is the contract
     * rather than an unfinished screen. Read off the service so that adding one is what fails,
     * rather than a component that happens not to call it yet.
     */
    it('offers no way to set, patch or undo a plan status', () => {
      const links = TestBed.inject(DirectoryLinkService) as unknown as Record<string, unknown>;

      expect(links.verifyPlanChoice).toBeTypeOf('function');
      for (const forbidden of ['updatePlanChoice', 'setPlanStatus', 'patchPlanChoice', 'unverifyPlanChoice', 'refusePlanChoice']) {
        expect(links[forbidden]).toBeUndefined();
      }
    });

    /**
     * VERIFIED is not ACTIVE. hc-patient's clients test for ACTIVE when deciding whether a patient
     * holds a plan, and what VERIFIED means beside it is an open question on their side — so this
     * console must not promise an outcome it does not decide.
     *
     * **Read out of the i18n bundle and NOT out of the DOM, and the first version of this case did
     * the latter and could not fail.** `provideTranslateService()` loads no catalogue in these
     * tests, so `TranslatePipe` renders the KEY — the button's text is
     * `hcAdminApp.…planChoice.verify`, which contains neither "verify" nor "activate" whatever the
     * English says. Measured: changing the bundle to "Activate this choice" left the DOM assertion
     * green. A wording rule has to be asserted against the words.
     *
     * The DOM half is still worth keeping and is here too — that the button exists at all, and that
     * it is bound to the key this case then reads, so the two cannot drift apart.
     */
    it('never labels the action "activate"', () => {
      withLink(CHOICE);
      fixture.componentRef.setInput('patient', { id: 'a13' });
      fixture.detectChanges();

      const button: HTMLElement = fixture.nativeElement.querySelector('[data-cy="verifyPlanChoice"]');
      expect(button).not.toBeNull();
      expect(button.textContent).toContain('hcAdminApp.directoryPatient.detail.planChoice.verify');

      const catalogue = JSON.parse(readFileSync('src/main/webapp/i18n/en/directoryPatient.json', 'utf8'));
      const label: string = catalogue.hcAdminApp.directoryPatient.detail.planChoice.verify;
      expect(label.toLowerCase()).not.toContain('activate');
      expect(label.toLowerCase()).toContain('verify');
    });

    /**
     * A membership can name no tier — hc-patient's `Membership.plan` carries no @NotNull — and the
     * server refuses to verify one, because the payload's single field is a consistency check that
     * a null defeats. `dl-plan-a5` in the `test` fixture is exactly this row, so the branch is
     * reachable on every stack rather than only in production.
     */
    it('renders no decision for a choice that names no tier', () => {
      withLink({ id: 'dl-plan-a5', localId: 'a5', planStatus: 'PENDING', planMembershipId: 'mem-a5-0204' });
      fixture.componentRef.setInput('patient', { id: 'a5' });
      fixture.detectChanges();

      expect(comp.hasPlanChoice()).toBe(false);
      expect(fixture.nativeElement.querySelector('[data-cy="verifyPlanChoice"]')).toBeNull();
    });

    it('renders no card for a patient with no plan choice at all', () => {
      withLink({ id: 'dl-a15', localId: 'a15' });
      fixture.componentRef.setInput('patient', { id: 'a15' });
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('[data-cy="planChoice"]')).toBeNull();
    });

    /**
     * **The reported status is not rewritten by verifying**, and this is the assertion most likely
     * to be "fixed" into a bug. `planStatus` is what hc-patient said when the membership was
     * created; their MembershipResource publishes on POST alone, so nothing announces the state
     * moving and this console stores none. Flipping the pill would assert a state no event has
     * reported — and the next PlanChosen would put it back.
     */
    it('leaves the reported status alone after announcing, and says only what was sent', () => {
      withLink(CHOICE);
      const links = TestBed.inject(DirectoryLinkService);
      vitest.spyOn(links, 'verifyPlanChoice').mockReturnValue(of({ plan: 'MELON', membershipId: 'mem-a13-0041' }));

      fixture.componentRef.setInput('patient', { id: 'a13' });
      fixture.detectChanges();
      comp.verifyPlanChoice();
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('[data-cy="planChoiceStatus"]').textContent).toContain('PENDING');
      expect(fixture.nativeElement.querySelector('[data-cy="planChoiceVerified"]')).not.toBeNull();
    });

    /** A failed publish must not confirm: it would say hc-patient was told when they were not. */
    it('confirms nothing when the announcement fails', () => {
      withLink(CHOICE);
      const links = TestBed.inject(DirectoryLinkService);
      vitest.spyOn(links, 'verifyPlanChoice').mockReturnValue(throwError(() => new Error('nope')));

      fixture.componentRef.setInput('patient', { id: 'a13' });
      fixture.detectChanges();
      comp.verifyPlanChoice();
      fixture.detectChanges();

      expect(comp.verifiedPlan()).toBeNull();
      expect(comp.isVerifying()).toBe(false);
      expect(fixture.nativeElement.querySelector('[data-cy="planChoiceVerified"]')).toBeNull();
    });

    /**
     * The stale-response window every signal on this component is keyed against.
     * `/patient/A/view` -> `/patient/B/view` reuses the instance, so A's link can land after B's
     * record has. Unkeyed, this would offer B's button against A's choice — a decision announced to
     * hc-patient about the wrong person.
     */
    it('ignores a link that belongs to a patient no longer on screen', () => {
      fixture.componentRef.setInput('patient', { id: 'a14' });
      comp.resolvedLink.set({ id: 'a13', link: CHOICE });

      expect(comp.planChoice()).toBeNull();
      expect(comp.hasPlanChoice()).toBe(false);
    });

    /** And a confirmation belonging to a choice no longer on screen is not shown either. */
    it('ignores a confirmation that belongs to another choice', () => {
      withLink(CHOICE);
      fixture.componentRef.setInput('patient', { id: 'a13' });
      fixture.detectChanges();
      comp.verified.set({ linkId: 'dl-plan-a6', plan: 'PAWPAW' });

      expect(comp.verifiedPlan()).toBeNull();
    });
  });
});
