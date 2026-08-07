import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { IPlatformService } from '../platform-service.model';
import { sampleWithFullData, sampleWithPartialData, sampleWithRequiredData } from '../platform-service.test-samples';

import { PlatformServiceService } from './platform-service.service';

const requireRestSample: IPlatformService = {
  ...sampleWithRequiredData,
};

describe('PlatformService Service', () => {
  let service: PlatformServiceService;
  let httpMock: HttpTestingController;
  let expectedResult: IPlatformService | IPlatformService[] | boolean | null;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClientTesting()],
    });
    expectedResult = null;
    service = TestBed.inject(PlatformServiceService);
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

    it('should return a list of PlatformService', () => {
      const returnedFromService = { ...requireRestSample };

      const expected = { ...sampleWithRequiredData };

      service.query().subscribe(resp => (expectedResult = resp.body));

      const req = httpMock.expectOne({ method: 'GET' });
      req.flush([returnedFromService]);
      httpMock.verify();
      expect(expectedResult).toMatchObject([expected]);
    });

    describe('addPlatformServiceToCollectionIfMissing', () => {
      it('should add a PlatformService to an empty array', () => {
        const platformService: IPlatformService = sampleWithRequiredData;
        expectedResult = service.addPlatformServiceToCollectionIfMissing([], platformService);
        expect(expectedResult).toEqual([platformService]);
      });

      it('should not add a PlatformService to an array that contains it', () => {
        const platformService: IPlatformService = sampleWithRequiredData;
        const platformServiceCollection: IPlatformService[] = [
          {
            ...platformService,
          },
          sampleWithPartialData,
        ];
        expectedResult = service.addPlatformServiceToCollectionIfMissing(platformServiceCollection, platformService);
        expect(expectedResult).toHaveLength(2);
      });

      it("should add a PlatformService to an array that doesn't contain it", () => {
        const platformService: IPlatformService = sampleWithRequiredData;
        const platformServiceCollection: IPlatformService[] = [sampleWithPartialData];
        expectedResult = service.addPlatformServiceToCollectionIfMissing(platformServiceCollection, platformService);
        expect(expectedResult).toHaveLength(2);
        expect(expectedResult).toContain(platformService);
      });

      it('should add only unique PlatformService to an array', () => {
        const platformServiceArray: IPlatformService[] = [sampleWithRequiredData, sampleWithPartialData, sampleWithFullData];
        const platformServiceCollection: IPlatformService[] = [sampleWithRequiredData];
        expectedResult = service.addPlatformServiceToCollectionIfMissing(platformServiceCollection, ...platformServiceArray);
        expect(expectedResult).toHaveLength(3);
      });

      it('should accept varargs', () => {
        const platformService: IPlatformService = sampleWithRequiredData;
        const platformService2: IPlatformService = sampleWithPartialData;
        expectedResult = service.addPlatformServiceToCollectionIfMissing([], platformService, platformService2);
        expect(expectedResult).toEqual([platformService, platformService2]);
      });

      it('should accept null and undefined values', () => {
        const platformService: IPlatformService = sampleWithRequiredData;
        expectedResult = service.addPlatformServiceToCollectionIfMissing([], null, platformService, undefined);
        expect(expectedResult).toEqual([platformService]);
      });

      it('should return initial array if no PlatformService is added', () => {
        const platformServiceCollection: IPlatformService[] = [sampleWithRequiredData];
        expectedResult = service.addPlatformServiceToCollectionIfMissing(platformServiceCollection, undefined, null);
        expect(expectedResult).toEqual(platformServiceCollection);
      });
    });

    describe('comparePlatformService', () => {
      it('should return true if both entities are null', () => {
        const entity1 = null;
        const entity2 = null;

        const compareResult = service.comparePlatformService(entity1, entity2);

        expect(compareResult).toEqual(true);
      });

      it('should return false if one entity is null', () => {
        const entity1 = { id: 8202 };
        const entity2 = null;

        const compareResult1 = service.comparePlatformService(entity1, entity2);
        const compareResult2 = service.comparePlatformService(entity2, entity1);

        expect(compareResult1).toEqual(false);
        expect(compareResult2).toEqual(false);
      });

      it('should return false if primaryKey differs', () => {
        const entity1 = { id: 8202 };
        const entity2 = { id: 7207 };

        const compareResult1 = service.comparePlatformService(entity1, entity2);
        const compareResult2 = service.comparePlatformService(entity2, entity1);

        expect(compareResult1).toEqual(false);
        expect(compareResult2).toEqual(false);
      });

      it('should return false if primaryKey matches', () => {
        const entity1 = { id: 8202 };
        const entity2 = { id: 8202 };

        const compareResult1 = service.comparePlatformService(entity1, entity2);
        const compareResult2 = service.comparePlatformService(entity2, entity1);

        expect(compareResult1).toEqual(true);
        expect(compareResult2).toEqual(true);
      });
    });
  });

  afterEach(() => {
    httpMock.verify();
  });
});
