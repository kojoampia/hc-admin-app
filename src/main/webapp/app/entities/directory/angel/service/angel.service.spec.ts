import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { IAngel } from '../angel.model';
import { sampleWithFullData, sampleWithNewData, sampleWithPartialData, sampleWithRequiredData } from '../angel.test-samples';

import { AngelService } from './angel.service';

const requireRestSample: IAngel = {
  ...sampleWithRequiredData,
};

describe('Angel Service', () => {
  let service: AngelService;
  let httpMock: HttpTestingController;
  let expectedResult: IAngel | IAngel[] | boolean | null;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClientTesting()],
    });
    expectedResult = null;
    service = TestBed.inject(AngelService);
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

    it('should create a Angel', () => {
      const angel = { ...sampleWithNewData };
      const returnedFromService = { ...requireRestSample };
      const expected = { ...sampleWithRequiredData };

      service.create(angel).subscribe(resp => (expectedResult = resp));

      const req = httpMock.expectOne({ method: 'POST' });
      req.flush(returnedFromService);
      expect(expectedResult).toMatchObject(expected);
    });

    it('should update a Angel', () => {
      const angel = { ...sampleWithRequiredData };
      const returnedFromService = { ...requireRestSample };
      const expected = { ...sampleWithRequiredData };

      service.update(angel).subscribe(resp => (expectedResult = resp));

      const req = httpMock.expectOne({ method: 'PUT' });
      req.flush(returnedFromService);
      expect(expectedResult).toMatchObject(expected);
    });

    it('should partial update a Angel', () => {
      const patchObject = { ...sampleWithPartialData };
      const returnedFromService = { ...requireRestSample };
      const expected = { ...sampleWithRequiredData };

      service.partialUpdate(patchObject).subscribe(resp => (expectedResult = resp));

      const req = httpMock.expectOne({ method: 'PATCH' });
      req.flush(returnedFromService);
      expect(expectedResult).toMatchObject(expected);
    });

    it('should return a list of Angel', () => {
      const returnedFromService = { ...requireRestSample };

      const expected = { ...sampleWithRequiredData };

      service.query().subscribe(resp => (expectedResult = resp.body));

      const req = httpMock.expectOne({ method: 'GET' });
      req.flush([returnedFromService]);
      httpMock.verify();
      expect(expectedResult).toMatchObject([expected]);
    });

    it('should delete a Angel', () => {
      service.delete(123).subscribe();

      const requests = httpMock.match({ method: 'DELETE' });
      expect(requests).toHaveLength(1);
    });

    describe('addAngelToCollectionIfMissing', () => {
      it('should add a Angel to an empty array', () => {
        const angel: IAngel = sampleWithRequiredData;
        expectedResult = service.addAngelToCollectionIfMissing([], angel);
        expect(expectedResult).toEqual([angel]);
      });

      it('should not add a Angel to an array that contains it', () => {
        const angel: IAngel = sampleWithRequiredData;
        const angelCollection: IAngel[] = [
          {
            ...angel,
          },
          sampleWithPartialData,
        ];
        expectedResult = service.addAngelToCollectionIfMissing(angelCollection, angel);
        expect(expectedResult).toHaveLength(2);
      });

      it("should add a Angel to an array that doesn't contain it", () => {
        const angel: IAngel = sampleWithRequiredData;
        const angelCollection: IAngel[] = [sampleWithPartialData];
        expectedResult = service.addAngelToCollectionIfMissing(angelCollection, angel);
        expect(expectedResult).toHaveLength(2);
        expect(expectedResult).toContain(angel);
      });

      it('should add only unique Angel to an array', () => {
        const angelArray: IAngel[] = [sampleWithRequiredData, sampleWithPartialData, sampleWithFullData];
        const angelCollection: IAngel[] = [sampleWithRequiredData];
        expectedResult = service.addAngelToCollectionIfMissing(angelCollection, ...angelArray);
        expect(expectedResult).toHaveLength(3);
      });

      it('should accept varargs', () => {
        const angel: IAngel = sampleWithRequiredData;
        const angel2: IAngel = sampleWithPartialData;
        expectedResult = service.addAngelToCollectionIfMissing([], angel, angel2);
        expect(expectedResult).toEqual([angel, angel2]);
      });

      it('should accept null and undefined values', () => {
        const angel: IAngel = sampleWithRequiredData;
        expectedResult = service.addAngelToCollectionIfMissing([], null, angel, undefined);
        expect(expectedResult).toEqual([angel]);
      });

      it('should return initial array if no Angel is added', () => {
        const angelCollection: IAngel[] = [sampleWithRequiredData];
        expectedResult = service.addAngelToCollectionIfMissing(angelCollection, undefined, null);
        expect(expectedResult).toEqual(angelCollection);
      });
    });

    describe('compareAngel', () => {
      it('should return true if both entities are null', () => {
        const entity1 = null;
        const entity2 = null;

        const compareResult = service.compareAngel(entity1, entity2);

        expect(compareResult).toEqual(true);
      });

      it('should return false if one entity is null', () => {
        const entity1 = { id: 23186 };
        const entity2 = null;

        const compareResult1 = service.compareAngel(entity1, entity2);
        const compareResult2 = service.compareAngel(entity2, entity1);

        expect(compareResult1).toEqual(false);
        expect(compareResult2).toEqual(false);
      });

      it('should return false if primaryKey differs', () => {
        const entity1 = { id: 23186 };
        const entity2 = { id: 4856 };

        const compareResult1 = service.compareAngel(entity1, entity2);
        const compareResult2 = service.compareAngel(entity2, entity1);

        expect(compareResult1).toEqual(false);
        expect(compareResult2).toEqual(false);
      });

      it('should return false if primaryKey matches', () => {
        const entity1 = { id: 23186 };
        const entity2 = { id: 23186 };

        const compareResult1 = service.compareAngel(entity1, entity2);
        const compareResult2 = service.compareAngel(entity2, entity1);

        expect(compareResult1).toEqual(true);
        expect(compareResult2).toEqual(true);
      });
    });
  });

  afterEach(() => {
    httpMock.verify();
  });
});
