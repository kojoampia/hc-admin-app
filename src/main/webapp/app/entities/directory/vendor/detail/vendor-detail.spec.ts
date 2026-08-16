import { beforeEach, describe, expect, it, vitest } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { FaIconLibrary } from '@fortawesome/angular-fontawesome';
import {
  faArrowLeft,
  faBoxArchive,
  faBoxOpen,
  faBuilding,
  faCreditCard,
  faEnvelope,
  faFileLines,
  faHospital,
  faPencilAlt,
  faTriangleExclamation,
  faUser,
} from '@fortawesome/free-solid-svg-icons';
import { provideTranslateService } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';

import { VendorService } from '../service/vendor.service';
import { VendorDetail } from './vendor-detail';

describe('Vendor Management Detail Component', () => {
  let comp: VendorDetail;
  let fixture: ComponentFixture<VendorDetail>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideTranslateService(),
        provideRouter(
          [
            {
              path: '**',
              loadComponent: () => import('./vendor-detail').then(m => m.VendorDetail),
              resolve: { vendor: () => of({ id: '478690b5-4f10-43b0-b67e-1148991a8421' }) },
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
    // Every icon the five cards and the action row use. A record that renders each field
    // correctly and throws on an icon is still a broken screen.
    library.addIcons(faBuilding, faUser, faCreditCard, faHospital, faFileLines, faEnvelope, faTriangleExclamation);
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(VendorDetail);
    comp = fixture.componentInstance;
  });

  describe('OnInit', () => {
    it('should load vendor on init', async () => {
      const harness = await RouterTestingHarness.create();
      const instance = await harness.navigateByUrl('/', VendorDetail);

      // THEN
      expect(instance.vendor()).toEqual(expect.objectContaining({ id: '478690b5-4f10-43b0-b67e-1148991a8421' }));
    });
  });

  describe('PreviousState', () => {
    it('should navigate to previous state', () => {
      vitest.spyOn(globalThis.history, 'back');
      comp.previousState();
      expect(globalThis.history.back).toHaveBeenCalled();
    });
  });

  describe('Archiving', () => {
    it('should PATCH only isArchived, never the whole record', () => {
      const service = TestBed.inject(VendorService);
      const setArchived = vitest.spyOn(service, 'setArchived').mockReturnValue(of({ id: 'a' }));
      fixture.componentRef.setInput('vendor', { id: 'a', isArchived: false });

      comp.toggleArchived();

      expect(setArchived).toHaveBeenCalledWith(expect.objectContaining({ id: 'a' }), true);
      expect(comp.isArchived()).toBe(true);
    });

    it('should flip back to Archive when unarchiving', () => {
      const service = TestBed.inject(VendorService);
      vitest.spyOn(service, 'setArchived').mockReturnValue(of({ id: 'a' }));
      fixture.componentRef.setInput('vendor', { id: 'a', isArchived: true });

      comp.toggleArchived();

      expect(comp.isArchived()).toBe(false);
    });

    // A failed write must not relabel the button: that would claim the record is
    // archived when the server still says it is not.
    it('should leave the flag alone when the write fails', () => {
      const service = TestBed.inject(VendorService);
      vitest.spyOn(service, 'setArchived').mockReturnValue(throwError(() => new Error('nope')));
      fixture.componentRef.setInput('vendor', { id: 'a', isArchived: false });

      comp.toggleArchived();

      expect(comp.isArchived()).toBe(false);
      expect(comp.isSaving()).toBe(false);
    });
  });

  describe('Sites and documents', () => {
    /**
     * Both are nested on the vendor and both are frequently absent. A card that renders nothing and
     * a card that renders an empty state are different screens, and only the second one tells the
     * truth about a vendor that simply has no sites.
     */
    it('should default both collections to empty rather than null', () => {
      fixture.componentRef.setInput('vendor', { id: 'v1' });
      expect(comp.facilities()).toEqual([]);
      expect(comp.documents()).toEqual([]);
    });

    it('should expose the sites a vendor operates', () => {
      fixture.componentRef.setInput('vendor', {
        id: 'v3',
        facilities: [
          { id: 'fac-3', name: 'GoldStar Pharmacy — Osu', type: 'PHARMACY' },
          { id: 'fac-4', name: 'GoldStar Pharmacy — Airport City', type: 'PHARMACY' },
        ],
      });
      expect(comp.facilities()).toHaveLength(2);
      expect(comp.facilities()[0].type).toBe('PHARMACY');
    });
  });

  /**
   * Under review is not suspended and not archived: a vendor under review is still trading while
   * somebody checks. It writes `status`, the same field and the same endpoint the professional
   * record suspends through.
   */
  describe('Placing under review', () => {
    it('should PATCH status to UNDER_REVIEW', () => {
      const service = TestBed.inject(VendorService);
      const patch = vitest.spyOn(service, 'partialUpdate').mockReturnValue(of({ id: 'v1' }));
      fixture.componentRef.setInput('vendor', { id: 'v1', status: 'ACTIVE' });

      comp.toggleReview();

      expect(patch).toHaveBeenCalledWith({ id: 'v1', status: 'UNDER_REVIEW' });
      expect(comp.isUnderReview()).toBe(true);
      expect(comp.isArchived()).toBe(false);
    });

    it('should clear a review back to active', () => {
      const service = TestBed.inject(VendorService);
      const patch = vitest.spyOn(service, 'partialUpdate').mockReturnValue(of({ id: 'v1' }));
      fixture.componentRef.setInput('vendor', { id: 'v1', status: 'UNDER_REVIEW' });

      comp.toggleReview();

      expect(patch).toHaveBeenCalledWith({ id: 'v1', status: 'ACTIVE' });
      expect(comp.isUnderReview()).toBe(false);
    });

    it('should leave the pill alone when the write fails', () => {
      const service = TestBed.inject(VendorService);
      vitest.spyOn(service, 'partialUpdate').mockReturnValue(throwError(() => new Error('nope')));
      fixture.componentRef.setInput('vendor', { id: 'v1', status: 'ACTIVE' });

      comp.toggleReview();

      expect(comp.isUnderReview()).toBe(false);
      expect(comp.isSaving()).toBe(false);
    });
  });

  describe('The record header', () => {
    it('should build initials from the trading name', () => {
      fixture.componentRef.setInput('vendor', { id: 'v1', name: 'Kaneshie Medical Supplies' });
      expect(comp.initials()).toBe('KM');
    });

    it('should fall back to the id when unnamed', () => {
      fixture.componentRef.setInput('vendor', { id: 'v1' });
      expect(comp.initials()).toBe('V1');
    });
  });
});
