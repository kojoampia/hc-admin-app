import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { IPlanFeature } from '../plan-feature.model';
import { sampleWithFullData, sampleWithNewData, sampleWithPartialData, sampleWithRequiredData } from '../plan-feature.test-samples';

import { PlanFeatureService } from './plan-feature.service';

const requireRestSample: IPlanFeature = {
  ...sampleWithRequiredData,
};

describe('PlanFeature Service', () => {
  let service: PlanFeatureService;
  let httpMock: HttpTestingController;
  let expectedResult: IPlanFeature | IPlanFeature[] | boolean | null;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClientTesting()],
    });
    expectedResult = null;
    service = TestBed.inject(PlanFeatureService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  describe('Service methods', () => {
    it('should find an element', () => {
      const returnedFromService = { ...requireRestSample };
      const expected = { ...sampleWithRequiredData };

      service.find(123).subscribe(resp => (expectedResult = resp));

      const req = httpMock.expectOne({ method: 'GET' });
      req.flush(returnedFromService);
      expect(expectedResult).toMatchObject(expected);
    });

    it('should create a PlanFeature', () => {
      const planFeature = { ...sampleWithNewData };
      const returnedFromService = { ...requireRestSample };
      const expected = { ...sampleWithRequiredData };

      service.create(planFeature).subscribe(resp => (expectedResult = resp));

      const req = httpMock.expectOne({ method: 'POST' });
      req.flush(returnedFromService);
      expect(expectedResult).toMatchObject(expected);
    });

    it('should update a PlanFeature', () => {
      const planFeature = { ...sampleWithRequiredData };
      const returnedFromService = { ...requireRestSample };
      const expected = { ...sampleWithRequiredData };

      service.update(planFeature).subscribe(resp => (expectedResult = resp));

      const req = httpMock.expectOne({ method: 'PUT' });
      req.flush(returnedFromService);
      expect(expectedResult).toMatchObject(expected);
    });

    it('should partial update a PlanFeature', () => {
      const patchObject = { ...sampleWithPartialData };
      const returnedFromService = { ...requireRestSample };
      const expected = { ...sampleWithRequiredData };

      service.partialUpdate(patchObject).subscribe(resp => (expectedResult = resp));

      const req = httpMock.expectOne({ method: 'PATCH' });
      req.flush(returnedFromService);
      expect(expectedResult).toMatchObject(expected);
    });

    it('should return a list of PlanFeature', () => {
      const returnedFromService = { ...requireRestSample };

      const expected = { ...sampleWithRequiredData };

      service.query().subscribe(resp => (expectedResult = resp.body));

      const req = httpMock.expectOne({ method: 'GET' });
      req.flush([returnedFromService]);
      httpMock.verify();
      expect(expectedResult).toMatchObject([expected]);
    });

    it('should delete a PlanFeature', () => {
      service.delete(123).subscribe();

      const requests = httpMock.match({ method: 'DELETE' });
      expect(requests).toHaveLength(1);
    });

    describe('addPlanFeatureToCollectionIfMissing', () => {
      it('should add a PlanFeature to an empty array', () => {
        const planFeature: IPlanFeature = sampleWithRequiredData;
        expectedResult = service.addPlanFeatureToCollectionIfMissing([], planFeature);
        expect(expectedResult).toEqual([planFeature]);
      });

      it('should not add a PlanFeature to an array that contains it', () => {
        const planFeature: IPlanFeature = sampleWithRequiredData;
        const planFeatureCollection: IPlanFeature[] = [
          {
            ...planFeature,
          },
          sampleWithPartialData,
        ];
        expectedResult = service.addPlanFeatureToCollectionIfMissing(planFeatureCollection, planFeature);
        expect(expectedResult).toHaveLength(2);
      });

      it("should add a PlanFeature to an array that doesn't contain it", () => {
        const planFeature: IPlanFeature = sampleWithRequiredData;
        const planFeatureCollection: IPlanFeature[] = [sampleWithPartialData];
        expectedResult = service.addPlanFeatureToCollectionIfMissing(planFeatureCollection, planFeature);
        expect(expectedResult).toHaveLength(2);
        expect(expectedResult).toContain(planFeature);
      });

      it('should add only unique PlanFeature to an array', () => {
        const planFeatureArray: IPlanFeature[] = [sampleWithRequiredData, sampleWithPartialData, sampleWithFullData];
        const planFeatureCollection: IPlanFeature[] = [sampleWithRequiredData];
        expectedResult = service.addPlanFeatureToCollectionIfMissing(planFeatureCollection, ...planFeatureArray);
        expect(expectedResult).toHaveLength(3);
      });

      it('should accept varargs', () => {
        const planFeature: IPlanFeature = sampleWithRequiredData;
        const planFeature2: IPlanFeature = sampleWithPartialData;
        expectedResult = service.addPlanFeatureToCollectionIfMissing([], planFeature, planFeature2);
        expect(expectedResult).toEqual([planFeature, planFeature2]);
      });

      it('should accept null and undefined values', () => {
        const planFeature: IPlanFeature = sampleWithRequiredData;
        expectedResult = service.addPlanFeatureToCollectionIfMissing([], null, planFeature, undefined);
        expect(expectedResult).toEqual([planFeature]);
      });

      it('should return initial array if no PlanFeature is added', () => {
        const planFeatureCollection: IPlanFeature[] = [sampleWithRequiredData];
        expectedResult = service.addPlanFeatureToCollectionIfMissing(planFeatureCollection, undefined, null);
        expect(expectedResult).toEqual(planFeatureCollection);
      });
    });

    describe('comparePlanFeature', () => {
      it('should return true if both entities are null', () => {
        const entity1 = null;
        const entity2 = null;

        const compareResult = service.comparePlanFeature(entity1, entity2);

        expect(compareResult).toEqual(true);
      });

      it('should return false if one entity is null', () => {
        const entity1 = { id: 22331 };
        const entity2 = null;

        const compareResult1 = service.comparePlanFeature(entity1, entity2);
        const compareResult2 = service.comparePlanFeature(entity2, entity1);

        expect(compareResult1).toEqual(false);
        expect(compareResult2).toEqual(false);
      });

      it('should return false if primaryKey differs', () => {
        const entity1 = { id: 22331 };
        const entity2 = { id: 16120 };

        const compareResult1 = service.comparePlanFeature(entity1, entity2);
        const compareResult2 = service.comparePlanFeature(entity2, entity1);

        expect(compareResult1).toEqual(false);
        expect(compareResult2).toEqual(false);
      });

      it('should return false if primaryKey matches', () => {
        const entity1 = { id: 22331 };
        const entity2 = { id: 22331 };

        const compareResult1 = service.comparePlanFeature(entity1, entity2);
        const compareResult2 = service.comparePlanFeature(entity2, entity1);

        expect(compareResult1).toEqual(true);
        expect(compareResult2).toEqual(true);
      });
    });
  });

  afterEach(() => {
    httpMock.verify();
  });
});
