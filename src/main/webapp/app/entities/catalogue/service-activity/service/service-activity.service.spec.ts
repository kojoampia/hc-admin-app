import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { IServiceActivity } from '../service-activity.model';
import { sampleWithFullData, sampleWithNewData, sampleWithPartialData, sampleWithRequiredData } from '../service-activity.test-samples';

import { ServiceActivityService } from './service-activity.service';

const requireRestSample: IServiceActivity = {
  ...sampleWithRequiredData,
};

describe('ServiceActivity Service', () => {
  let service: ServiceActivityService;
  let httpMock: HttpTestingController;
  let expectedResult: IServiceActivity | IServiceActivity[] | boolean | null;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClientTesting()],
    });
    expectedResult = null;
    service = TestBed.inject(ServiceActivityService);
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

    it('should create a ServiceActivity', () => {
      const serviceActivity = { ...sampleWithNewData };
      const returnedFromService = { ...requireRestSample };
      const expected = { ...sampleWithRequiredData };

      service.create(serviceActivity).subscribe(resp => (expectedResult = resp));

      const req = httpMock.expectOne({ method: 'POST' });
      req.flush(returnedFromService);
      expect(expectedResult).toMatchObject(expected);
    });

    it('should update a ServiceActivity', () => {
      const serviceActivity = { ...sampleWithRequiredData };
      const returnedFromService = { ...requireRestSample };
      const expected = { ...sampleWithRequiredData };

      service.update(serviceActivity).subscribe(resp => (expectedResult = resp));

      const req = httpMock.expectOne({ method: 'PUT' });
      req.flush(returnedFromService);
      expect(expectedResult).toMatchObject(expected);
    });

    it('should partial update a ServiceActivity', () => {
      const patchObject = { ...sampleWithPartialData };
      const returnedFromService = { ...requireRestSample };
      const expected = { ...sampleWithRequiredData };

      service.partialUpdate(patchObject).subscribe(resp => (expectedResult = resp));

      const req = httpMock.expectOne({ method: 'PATCH' });
      req.flush(returnedFromService);
      expect(expectedResult).toMatchObject(expected);
    });

    it('should return a list of ServiceActivity', () => {
      const returnedFromService = { ...requireRestSample };

      const expected = { ...sampleWithRequiredData };

      service.query().subscribe(resp => (expectedResult = resp.body));

      const req = httpMock.expectOne({ method: 'GET' });
      req.flush([returnedFromService]);
      httpMock.verify();
      expect(expectedResult).toMatchObject([expected]);
    });

    it('should delete a ServiceActivity', () => {
      service.delete('ABC').subscribe();

      const requests = httpMock.match({ method: 'DELETE' });
      expect(requests).toHaveLength(1);
    });

    describe('addServiceActivityToCollectionIfMissing', () => {
      it('should add a ServiceActivity to an empty array', () => {
        const serviceActivity: IServiceActivity = sampleWithRequiredData;
        expectedResult = service.addServiceActivityToCollectionIfMissing([], serviceActivity);
        expect(expectedResult).toEqual([serviceActivity]);
      });

      it('should not add a ServiceActivity to an array that contains it', () => {
        const serviceActivity: IServiceActivity = sampleWithRequiredData;
        const serviceActivityCollection: IServiceActivity[] = [
          {
            ...serviceActivity,
          },
          sampleWithPartialData,
        ];
        expectedResult = service.addServiceActivityToCollectionIfMissing(serviceActivityCollection, serviceActivity);
        expect(expectedResult).toHaveLength(2);
      });

      it("should add a ServiceActivity to an array that doesn't contain it", () => {
        const serviceActivity: IServiceActivity = sampleWithRequiredData;
        const serviceActivityCollection: IServiceActivity[] = [sampleWithPartialData];
        expectedResult = service.addServiceActivityToCollectionIfMissing(serviceActivityCollection, serviceActivity);
        expect(expectedResult).toHaveLength(2);
        expect(expectedResult).toContain(serviceActivity);
      });

      it('should add only unique ServiceActivity to an array', () => {
        const serviceActivityArray: IServiceActivity[] = [sampleWithRequiredData, sampleWithPartialData, sampleWithFullData];
        const serviceActivityCollection: IServiceActivity[] = [sampleWithRequiredData];
        expectedResult = service.addServiceActivityToCollectionIfMissing(serviceActivityCollection, ...serviceActivityArray);
        expect(expectedResult).toHaveLength(3);
      });

      it('should accept varargs', () => {
        const serviceActivity: IServiceActivity = sampleWithRequiredData;
        const serviceActivity2: IServiceActivity = sampleWithPartialData;
        expectedResult = service.addServiceActivityToCollectionIfMissing([], serviceActivity, serviceActivity2);
        expect(expectedResult).toEqual([serviceActivity, serviceActivity2]);
      });

      it('should accept null and undefined values', () => {
        const serviceActivity: IServiceActivity = sampleWithRequiredData;
        expectedResult = service.addServiceActivityToCollectionIfMissing([], null, serviceActivity, undefined);
        expect(expectedResult).toEqual([serviceActivity]);
      });

      it('should return initial array if no ServiceActivity is added', () => {
        const serviceActivityCollection: IServiceActivity[] = [sampleWithRequiredData];
        expectedResult = service.addServiceActivityToCollectionIfMissing(serviceActivityCollection, undefined, null);
        expect(expectedResult).toEqual(serviceActivityCollection);
      });
    });

    describe('compareServiceActivity', () => {
      it('should return true if both entities are null', () => {
        const entity1 = null;
        const entity2 = null;

        const compareResult = service.compareServiceActivity(entity1, entity2);

        expect(compareResult).toEqual(true);
      });

      it('should return false if one entity is null', () => {
        const entity1 = { id: 'e58e53d8-3de4-4287-add1-bbf6e52730f0' };
        const entity2 = null;

        const compareResult1 = service.compareServiceActivity(entity1, entity2);
        const compareResult2 = service.compareServiceActivity(entity2, entity1);

        expect(compareResult1).toEqual(false);
        expect(compareResult2).toEqual(false);
      });

      it('should return false if primaryKey differs', () => {
        const entity1 = { id: 'e58e53d8-3de4-4287-add1-bbf6e52730f0' };
        const entity2 = { id: '0838588b-421d-42a6-97a1-14b21853407e' };

        const compareResult1 = service.compareServiceActivity(entity1, entity2);
        const compareResult2 = service.compareServiceActivity(entity2, entity1);

        expect(compareResult1).toEqual(false);
        expect(compareResult2).toEqual(false);
      });

      it('should return false if primaryKey matches', () => {
        const entity1 = { id: 'e58e53d8-3de4-4287-add1-bbf6e52730f0' };
        const entity2 = { id: 'e58e53d8-3de4-4287-add1-bbf6e52730f0' };

        const compareResult1 = service.compareServiceActivity(entity1, entity2);
        const compareResult2 = service.compareServiceActivity(entity2, entity1);

        expect(compareResult1).toEqual(true);
        expect(compareResult2).toEqual(true);
      });
    });
  });

  afterEach(() => {
    httpMock.verify();
  });
});
