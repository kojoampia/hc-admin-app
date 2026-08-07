import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { IAuditEntry } from '../audit-entry.model';
import { sampleWithFullData, sampleWithPartialData, sampleWithRequiredData } from '../audit-entry.test-samples';

import { AuditEntryService, RestAuditEntry } from './audit-entry.service';

const requireRestSample: RestAuditEntry = {
  ...sampleWithRequiredData,
  occurredAt: sampleWithRequiredData.occurredAt?.toJSON(),
};

describe('AuditEntry Service', () => {
  let service: AuditEntryService;
  let httpMock: HttpTestingController;
  let expectedResult: IAuditEntry | IAuditEntry[] | boolean | null;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClientTesting()],
    });
    expectedResult = null;
    service = TestBed.inject(AuditEntryService);
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

    it('should return a list of AuditEntry', () => {
      const returnedFromService = { ...requireRestSample };

      const expected = { ...sampleWithRequiredData };

      service.query().subscribe(resp => (expectedResult = resp.body));

      const req = httpMock.expectOne({ method: 'GET' });
      req.flush([returnedFromService]);
      httpMock.verify();
      expect(expectedResult).toMatchObject([expected]);
    });

    describe('addAuditEntryToCollectionIfMissing', () => {
      it('should add a AuditEntry to an empty array', () => {
        const auditEntry: IAuditEntry = sampleWithRequiredData;
        expectedResult = service.addAuditEntryToCollectionIfMissing([], auditEntry);
        expect(expectedResult).toEqual([auditEntry]);
      });

      it('should not add a AuditEntry to an array that contains it', () => {
        const auditEntry: IAuditEntry = sampleWithRequiredData;
        const auditEntryCollection: IAuditEntry[] = [
          {
            ...auditEntry,
          },
          sampleWithPartialData,
        ];
        expectedResult = service.addAuditEntryToCollectionIfMissing(auditEntryCollection, auditEntry);
        expect(expectedResult).toHaveLength(2);
      });

      it("should add a AuditEntry to an array that doesn't contain it", () => {
        const auditEntry: IAuditEntry = sampleWithRequiredData;
        const auditEntryCollection: IAuditEntry[] = [sampleWithPartialData];
        expectedResult = service.addAuditEntryToCollectionIfMissing(auditEntryCollection, auditEntry);
        expect(expectedResult).toHaveLength(2);
        expect(expectedResult).toContain(auditEntry);
      });

      it('should add only unique AuditEntry to an array', () => {
        const auditEntryArray: IAuditEntry[] = [sampleWithRequiredData, sampleWithPartialData, sampleWithFullData];
        const auditEntryCollection: IAuditEntry[] = [sampleWithRequiredData];
        expectedResult = service.addAuditEntryToCollectionIfMissing(auditEntryCollection, ...auditEntryArray);
        expect(expectedResult).toHaveLength(3);
      });

      it('should accept varargs', () => {
        const auditEntry: IAuditEntry = sampleWithRequiredData;
        const auditEntry2: IAuditEntry = sampleWithPartialData;
        expectedResult = service.addAuditEntryToCollectionIfMissing([], auditEntry, auditEntry2);
        expect(expectedResult).toEqual([auditEntry, auditEntry2]);
      });

      it('should accept null and undefined values', () => {
        const auditEntry: IAuditEntry = sampleWithRequiredData;
        expectedResult = service.addAuditEntryToCollectionIfMissing([], null, auditEntry, undefined);
        expect(expectedResult).toEqual([auditEntry]);
      });

      it('should return initial array if no AuditEntry is added', () => {
        const auditEntryCollection: IAuditEntry[] = [sampleWithRequiredData];
        expectedResult = service.addAuditEntryToCollectionIfMissing(auditEntryCollection, undefined, null);
        expect(expectedResult).toEqual(auditEntryCollection);
      });
    });

    describe('compareAuditEntry', () => {
      it('should return true if both entities are null', () => {
        const entity1 = null;
        const entity2 = null;

        const compareResult = service.compareAuditEntry(entity1, entity2);

        expect(compareResult).toEqual(true);
      });

      it('should return false if one entity is null', () => {
        const entity1 = { id: '18e349fa-b6ee-46ed-99ec-d39c6acd50f3' };
        const entity2 = null;

        const compareResult1 = service.compareAuditEntry(entity1, entity2);
        const compareResult2 = service.compareAuditEntry(entity2, entity1);

        expect(compareResult1).toEqual(false);
        expect(compareResult2).toEqual(false);
      });

      it('should return false if primaryKey differs', () => {
        const entity1 = { id: '18e349fa-b6ee-46ed-99ec-d39c6acd50f3' };
        const entity2 = { id: '4ef4677d-c9b5-40a1-87b3-760be5bd989d' };

        const compareResult1 = service.compareAuditEntry(entity1, entity2);
        const compareResult2 = service.compareAuditEntry(entity2, entity1);

        expect(compareResult1).toEqual(false);
        expect(compareResult2).toEqual(false);
      });

      it('should return false if primaryKey matches', () => {
        const entity1 = { id: '18e349fa-b6ee-46ed-99ec-d39c6acd50f3' };
        const entity2 = { id: '18e349fa-b6ee-46ed-99ec-d39c6acd50f3' };

        const compareResult1 = service.compareAuditEntry(entity1, entity2);
        const compareResult2 = service.compareAuditEntry(entity2, entity1);

        expect(compareResult1).toEqual(true);
        expect(compareResult2).toEqual(true);
      });
    });
  });

  afterEach(() => {
    httpMock.verify();
  });
});
