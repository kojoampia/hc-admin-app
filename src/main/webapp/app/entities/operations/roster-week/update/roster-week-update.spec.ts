import { beforeEach, describe, expect, it, vitest } from 'vitest';
import { readFileSync } from 'node:fs';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';

import { provideTranslateService } from '@ngx-translate/core';
import { Subject, from, of } from 'rxjs';

import { IRosterWeek } from '../roster-week.model';
import { RosterWeekService } from '../service/roster-week.service';

import { RosterWeekFormService } from './roster-week-form.service';
import { RosterWeekUpdate } from './roster-week-update';

describe('RosterWeek Management Update Component', () => {
  let comp: RosterWeekUpdate;
  let fixture: ComponentFixture<RosterWeekUpdate>;
  let activatedRoute: ActivatedRoute;
  let rosterWeekFormService: RosterWeekFormService;
  let rosterWeekService: RosterWeekService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideTranslateService(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: {
            params: from([{}]),
          },
        },
      ],
    });

    fixture = TestBed.createComponent(RosterWeekUpdate);
    activatedRoute = TestBed.inject(ActivatedRoute);
    rosterWeekFormService = TestBed.inject(RosterWeekFormService);
    rosterWeekService = TestBed.inject(RosterWeekService);

    comp = fixture.componentInstance;
  });

  describe('ngOnInit', () => {
    it('should update editForm', () => {
      const rosterWeek: IRosterWeek = { id: 'f8466048-f088-4ce3-9408-2613ebaefbdd' };

      activatedRoute.data = of({ rosterWeek });
      comp.ngOnInit();

      expect(comp.rosterWeek).toEqual(rosterWeek);
    });
  });

  describe('save', () => {
    it('should call update service on save for existing entity', () => {
      // GIVEN
      const saveSubject = new Subject<IRosterWeek>();
      const rosterWeek = { id: 'ade462b2-f291-49db-a5f8-d4638f0545b4' };
      vitest.spyOn(rosterWeekFormService, 'getRosterWeek').mockReturnValue(rosterWeek);
      vitest.spyOn(rosterWeekService, 'update').mockReturnValue(saveSubject);
      vitest.spyOn(comp, 'previousState');
      activatedRoute.data = of({ rosterWeek });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving()).toEqual(true);
      saveSubject.next(rosterWeek);
      saveSubject.complete();

      // THEN
      expect(rosterWeekFormService.getRosterWeek).toHaveBeenCalled();
      expect(comp.previousState).toHaveBeenCalled();
      expect(rosterWeekService.update).toHaveBeenCalledWith(expect.objectContaining(rosterWeek));
      expect(comp.isSaving()).toEqual(false);
    });

    it('should call create service on save for new entity', () => {
      // GIVEN
      const saveSubject = new Subject<IRosterWeek>();
      const rosterWeek = { id: 'ade462b2-f291-49db-a5f8-d4638f0545b4' };
      vitest.spyOn(rosterWeekFormService, 'getRosterWeek').mockReturnValue({ id: null });
      vitest.spyOn(rosterWeekService, 'create').mockReturnValue(saveSubject);
      vitest.spyOn(comp, 'previousState');
      activatedRoute.data = of({ rosterWeek: null });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving()).toEqual(true);
      saveSubject.next(rosterWeek);
      saveSubject.complete();

      // THEN
      expect(rosterWeekFormService.getRosterWeek).toHaveBeenCalled();
      expect(rosterWeekService.create).toHaveBeenCalled();
      expect(comp.isSaving()).toEqual(false);
      expect(comp.previousState).toHaveBeenCalled();
    });

    it('should set isSaving to false on error', () => {
      // GIVEN
      const saveSubject = new Subject<IRosterWeek>();
      const rosterWeek = { id: 'ade462b2-f291-49db-a5f8-d4638f0545b4' };
      vitest.spyOn(rosterWeekService, 'update').mockReturnValue(saveSubject);
      vitest.spyOn(comp, 'previousState');
      activatedRoute.data = of({ rosterWeek });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving()).toEqual(true);
      saveSubject.error('This is an error!');

      // THEN
      expect(rosterWeekService.update).toHaveBeenCalled();
      expect(comp.isSaving()).toEqual(false);
      expect(comp.previousState).not.toHaveBeenCalled();
    });
  });
});

/**
 * <b>`publishedAt` is not on this form, and must stay off it.</b>
 *
 * <p>The server owns the field. `RosterWeekLifecycleCallback` derives it from `published` (decision
 * 8 of `duty-roster-resolution.md` § 9.1) and `RosterWeekResource.stripServerOwnedFields` nulls
 * whatever arrives on POST and PUT — so while the generated `datetime-local` was rendered, an
 * administrator could set a publication date, get a 200, and have the value discarded. That is the
 * client/server disagreement decision 8 was taken to end, surviving one screen along.
 *
 * <p>Its siblings `Message.readAt` and `Task.closedAt` are simply absent from their DTOs, so nothing
 * on the wire can carry them. `RosterWeek` is serialised as the domain entity with no DTO at all, so
 * the field cannot leave the wire — which is why it had to leave the form instead, and why this has
 * to be pinned rather than left to the type system.
 *
 * <p>Pinned the way the patient list's missing Create button is: this is a generated screen whose
 * siblings carry a field for every property, so pasting it back reads as consistency rather than as
 * a change. The template is READ rather than rendered, because absence is the assertion and a query
 * that finds nothing passes just as well against a component that failed to render at all.
 */
describe('the roster week edit template', () => {
  const template = readFileSync('src/main/webapp/app/entities/operations/roster-week/update/roster-week-update.html', 'utf8');

  it.each(['field_publishedAt', 'formControlName="publishedAt"', 'data-cy="publishedAt"', 'datetime-local'])('renders no %s', marker => {
    expect(template).not.toContain(marker);
  });

  /** The absence is only safe while it is explained: an unexplained gap gets filled back in. */
  it('says why, where the next person to edit it will look', () => {
    expect(template).toContain('publishedAt is NOT on this form');
    expect(template).toContain('stripServerOwnedFields');
  });
});
