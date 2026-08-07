import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { IServicePlan } from '../service-plan.model';
import { sampleWithFullData, sampleWithNewData, sampleWithPartialData, sampleWithRequiredData } from '../service-plan.test-samples';

import { ServicePlanService } from './service-plan.service';

const requireRestSample: IServicePlan = {
  ...sampleWithRequiredData,
};

describe('ServicePlan Service', () => {
  let service: ServicePlanService;
  let httpMock: HttpTestingController;
  let expectedResult: IServicePlan | IServicePlan[] | boolean | null;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClientTesting()],
    });
    expectedResult = null;
    service = TestBed.inject(ServicePlanService);
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

    it('should create a ServicePlan', () => {
      const servicePlan = { ...sampleWithNewData };
      const returnedFromService = { ...requireRestSample };
      const expected = { ...sampleWithRequiredData };

      service.create(servicePlan).subscribe(resp => (expectedResult = resp));

      const req = httpMock.expectOne({ method: 'POST' });
      req.flush(returnedFromService);
      expect(expectedResult).toMatchObject(expected);
    });

    it('should update a ServicePlan', () => {
      const servicePlan = { ...sampleWithRequiredData };
      const returnedFromService = { ...requireRestSample };
      const expected = { ...sampleWithRequiredData };

      service.update(servicePlan).subscribe(resp => (expectedResult = resp));

      const req = httpMock.expectOne({ method: 'PUT' });
      req.flush(returnedFromService);
      expect(expectedResult).toMatchObject(expected);
    });

    it('should partial update a ServicePlan', () => {
      const patchObject = { ...sampleWithPartialData };
      const returnedFromService = { ...requireRestSample };
      const expected = { ...sampleWithRequiredData };

      service.partialUpdate(patchObject).subscribe(resp => (expectedResult = resp));

      const req = httpMock.expectOne({ method: 'PATCH' });
      req.flush(returnedFromService);
      expect(expectedResult).toMatchObject(expected);
    });

    it('should return a list of ServicePlan', () => {
      const returnedFromService = { ...requireRestSample };

      const expected = { ...sampleWithRequiredData };

      service.query().subscribe(resp => (expectedResult = resp.body));

      const req = httpMock.expectOne({ method: 'GET' });
      req.flush([returnedFromService]);
      httpMock.verify();
      expect(expectedResult).toMatchObject([expected]);
    });

    it('should delete a ServicePlan', () => {
      service.delete(123).subscribe();

      const requests = httpMock.match({ method: 'DELETE' });
      expect(requests).toHaveLength(1);
    });

    describe('addServicePlanToCollectionIfMissing', () => {
      it('should add a ServicePlan to an empty array', () => {
        const servicePlan: IServicePlan = sampleWithRequiredData;
        expectedResult = service.addServicePlanToCollectionIfMissing([], servicePlan);
        expect(expectedResult).toEqual([servicePlan]);
      });

      it('should not add a ServicePlan to an array that contains it', () => {
        const servicePlan: IServicePlan = sampleWithRequiredData;
        const servicePlanCollection: IServicePlan[] = [
          {
            ...servicePlan,
          },
          sampleWithPartialData,
        ];
        expectedResult = service.addServicePlanToCollectionIfMissing(servicePlanCollection, servicePlan);
        expect(expectedResult).toHaveLength(2);
      });

      it("should add a ServicePlan to an array that doesn't contain it", () => {
        const servicePlan: IServicePlan = sampleWithRequiredData;
        const servicePlanCollection: IServicePlan[] = [sampleWithPartialData];
        expectedResult = service.addServicePlanToCollectionIfMissing(servicePlanCollection, servicePlan);
        expect(expectedResult).toHaveLength(2);
        expect(expectedResult).toContain(servicePlan);
      });

      it('should add only unique ServicePlan to an array', () => {
        const servicePlanArray: IServicePlan[] = [sampleWithRequiredData, sampleWithPartialData, sampleWithFullData];
        const servicePlanCollection: IServicePlan[] = [sampleWithRequiredData];
        expectedResult = service.addServicePlanToCollectionIfMissing(servicePlanCollection, ...servicePlanArray);
        expect(expectedResult).toHaveLength(3);
      });

      it('should accept varargs', () => {
        const servicePlan: IServicePlan = sampleWithRequiredData;
        const servicePlan2: IServicePlan = sampleWithPartialData;
        expectedResult = service.addServicePlanToCollectionIfMissing([], servicePlan, servicePlan2);
        expect(expectedResult).toEqual([servicePlan, servicePlan2]);
      });

      it('should accept null and undefined values', () => {
        const servicePlan: IServicePlan = sampleWithRequiredData;
        expectedResult = service.addServicePlanToCollectionIfMissing([], null, servicePlan, undefined);
        expect(expectedResult).toEqual([servicePlan]);
      });

      it('should return initial array if no ServicePlan is added', () => {
        const servicePlanCollection: IServicePlan[] = [sampleWithRequiredData];
        expectedResult = service.addServicePlanToCollectionIfMissing(servicePlanCollection, undefined, null);
        expect(expectedResult).toEqual(servicePlanCollection);
      });
    });

    describe('compareServicePlan', () => {
      it('should return true if both entities are null', () => {
        const entity1 = null;
        const entity2 = null;

        const compareResult = service.compareServicePlan(entity1, entity2);

        expect(compareResult).toEqual(true);
      });

      it('should return false if one entity is null', () => {
        const entity1 = { id: 23672 };
        const entity2 = null;

        const compareResult1 = service.compareServicePlan(entity1, entity2);
        const compareResult2 = service.compareServicePlan(entity2, entity1);

        expect(compareResult1).toEqual(false);
        expect(compareResult2).toEqual(false);
      });

      it('should return false if primaryKey differs', () => {
        const entity1 = { id: 23672 };
        const entity2 = { id: 11825 };

        const compareResult1 = service.compareServicePlan(entity1, entity2);
        const compareResult2 = service.compareServicePlan(entity2, entity1);

        expect(compareResult1).toEqual(false);
        expect(compareResult2).toEqual(false);
      });

      it('should return false if primaryKey matches', () => {
        const entity1 = { id: 23672 };
        const entity2 = { id: 23672 };

        const compareResult1 = service.compareServicePlan(entity1, entity2);
        const compareResult2 = service.compareServicePlan(entity2, entity1);

        expect(compareResult1).toEqual(true);
        expect(compareResult2).toEqual(true);
      });
    });
  });

  afterEach(() => {
    httpMock.verify();
  });
});
