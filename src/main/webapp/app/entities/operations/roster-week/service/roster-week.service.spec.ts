import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { DATE_FORMAT } from 'app/config/input.constants';
import { IRosterWeek } from '../roster-week.model';
import { sampleWithFullData, sampleWithNewData, sampleWithPartialData, sampleWithRequiredData } from '../roster-week.test-samples';

import { RestRosterWeek, RosterWeekService } from './roster-week.service';

const requireRestSample: RestRosterWeek = {
  ...sampleWithRequiredData,
  startDate: sampleWithRequiredData.startDate?.format(DATE_FORMAT),
  publishedAt: sampleWithRequiredData.publishedAt?.toJSON(),
};

describe('RosterWeek Service', () => {
  let service: RosterWeekService;
  let httpMock: HttpTestingController;
  let expectedResult: IRosterWeek | IRosterWeek[] | boolean | null;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClientTesting()],
    });
    expectedResult = null;
    service = TestBed.inject(RosterWeekService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  describe('Service methods', () => {
    it('should find an element', () => {
      const returnedFromService = { ...requireRestSample };
      const expected = { ...sampleWithRequiredData };

      service.find('ABC').subscribe(resp => (expectedResult = resp));

      const req = httpMock.expectOne({ method: 'GET' });
      req.flush(returnedFromService);
      expect(expectedResult).toMatchObject(expected);
    });

    it('should create a RosterWeek', () => {
      const rosterWeek = { ...sampleWithNewData };
      const returnedFromService = { ...requireRestSample };
      const expected = { ...sampleWithRequiredData };

      service.create(rosterWeek).subscribe(resp => (expectedResult = resp));

      const req = httpMock.expectOne({ method: 'POST' });
      req.flush(returnedFromService);
      expect(expectedResult).toMatchObject(expected);
    });

    it('should update a RosterWeek', () => {
      const rosterWeek = { ...sampleWithRequiredData };
      const returnedFromService = { ...requireRestSample };
      const expected = { ...sampleWithRequiredData };

      service.update(rosterWeek).subscribe(resp => (expectedResult = resp));

      const req = httpMock.expectOne({ method: 'PUT' });
      req.flush(returnedFromService);
      expect(expectedResult).toMatchObject(expected);
    });

    it('should partial update a RosterWeek', () => {
      const patchObject = { ...sampleWithPartialData };
      const returnedFromService = { ...requireRestSample };
      const expected = { ...sampleWithRequiredData };

      service.partialUpdate(patchObject).subscribe(resp => (expectedResult = resp));

      const req = httpMock.expectOne({ method: 'PATCH' });
      req.flush(returnedFromService);
      expect(expectedResult).toMatchObject(expected);
    });

    it('should return a list of RosterWeek', () => {
      const returnedFromService = { ...requireRestSample };

      const expected = { ...sampleWithRequiredData };

      service.query().subscribe(resp => (expectedResult = resp.body));

      const req = httpMock.expectOne({ method: 'GET' });
      req.flush([returnedFromService]);
      httpMock.verify();
      expect(expectedResult).toMatchObject([expected]);
    });

    it('should delete a RosterWeek', () => {
      service.delete('ABC').subscribe();

      const requests = httpMock.match({ method: 'DELETE' });
      expect(requests).toHaveLength(1);
    });

    describe('addRosterWeekToCollectionIfMissing', () => {
      it('should add a RosterWeek to an empty array', () => {
        const rosterWeek: IRosterWeek = sampleWithRequiredData;
        expectedResult = service.addRosterWeekToCollectionIfMissing([], rosterWeek);
        expect(expectedResult).toEqual([rosterWeek]);
      });

      it('should not add a RosterWeek to an array that contains it', () => {
        const rosterWeek: IRosterWeek = sampleWithRequiredData;
        const rosterWeekCollection: IRosterWeek[] = [
          {
            ...rosterWeek,
          },
          sampleWithPartialData,
        ];
        expectedResult = service.addRosterWeekToCollectionIfMissing(rosterWeekCollection, rosterWeek);
        expect(expectedResult).toHaveLength(2);
      });

      it("should add a RosterWeek to an array that doesn't contain it", () => {
        const rosterWeek: IRosterWeek = sampleWithRequiredData;
        const rosterWeekCollection: IRosterWeek[] = [sampleWithPartialData];
        expectedResult = service.addRosterWeekToCollectionIfMissing(rosterWeekCollection, rosterWeek);
        expect(expectedResult).toHaveLength(2);
        expect(expectedResult).toContain(rosterWeek);
      });

      it('should add only unique RosterWeek to an array', () => {
        const rosterWeekArray: IRosterWeek[] = [sampleWithRequiredData, sampleWithPartialData, sampleWithFullData];
        const rosterWeekCollection: IRosterWeek[] = [sampleWithRequiredData];
        expectedResult = service.addRosterWeekToCollectionIfMissing(rosterWeekCollection, ...rosterWeekArray);
        expect(expectedResult).toHaveLength(3);
      });

      it('should accept varargs', () => {
        const rosterWeek: IRosterWeek = sampleWithRequiredData;
        const rosterWeek2: IRosterWeek = sampleWithPartialData;
        expectedResult = service.addRosterWeekToCollectionIfMissing([], rosterWeek, rosterWeek2);
        expect(expectedResult).toEqual([rosterWeek, rosterWeek2]);
      });

      it('should accept null and undefined values', () => {
        const rosterWeek: IRosterWeek = sampleWithRequiredData;
        expectedResult = service.addRosterWeekToCollectionIfMissing([], null, rosterWeek, undefined);
        expect(expectedResult).toEqual([rosterWeek]);
      });

      it('should return initial array if no RosterWeek is added', () => {
        const rosterWeekCollection: IRosterWeek[] = [sampleWithRequiredData];
        expectedResult = service.addRosterWeekToCollectionIfMissing(rosterWeekCollection, undefined, null);
        expect(expectedResult).toEqual(rosterWeekCollection);
      });
    });

    describe('compareRosterWeek', () => {
      it('should return true if both entities are null', () => {
        const entity1 = null;
        const entity2 = null;

        const compareResult = service.compareRosterWeek(entity1, entity2);

        expect(compareResult).toEqual(true);
      });

      it('should return false if one entity is null', () => {
        const entity1 = { id: 'ade462b2-f291-49db-a5f8-d4638f0545b4' };
        const entity2 = null;

        const compareResult1 = service.compareRosterWeek(entity1, entity2);
        const compareResult2 = service.compareRosterWeek(entity2, entity1);

        expect(compareResult1).toEqual(false);
        expect(compareResult2).toEqual(false);
      });

      it('should return false if primaryKey differs', () => {
        const entity1 = { id: 'ade462b2-f291-49db-a5f8-d4638f0545b4' };
        const entity2 = { id: 'f8466048-f088-4ce3-9408-2613ebaefbdd' };

        const compareResult1 = service.compareRosterWeek(entity1, entity2);
        const compareResult2 = service.compareRosterWeek(entity2, entity1);

        expect(compareResult1).toEqual(false);
        expect(compareResult2).toEqual(false);
      });

      it('should return false if primaryKey matches', () => {
        const entity1 = { id: 'ade462b2-f291-49db-a5f8-d4638f0545b4' };
        const entity2 = { id: 'ade462b2-f291-49db-a5f8-d4638f0545b4' };

        const compareResult1 = service.compareRosterWeek(entity1, entity2);
        const compareResult2 = service.compareRosterWeek(entity2, entity1);

        expect(compareResult1).toEqual(true);
        expect(compareResult2).toEqual(true);
      });
    });
  });

  afterEach(() => {
    httpMock.verify();
  });
});
