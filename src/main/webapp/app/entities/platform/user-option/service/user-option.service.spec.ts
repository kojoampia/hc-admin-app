import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { IUserOption } from '../user-option.model';
import { sampleWithFullData, sampleWithNewData, sampleWithPartialData, sampleWithRequiredData } from '../user-option.test-samples';

import { UserOptionService } from './user-option.service';

const requireRestSample: IUserOption = {
  ...sampleWithRequiredData,
};

describe('UserOption Service', () => {
  let service: UserOptionService;
  let httpMock: HttpTestingController;
  let expectedResult: IUserOption | IUserOption[] | boolean | null;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClientTesting()],
    });
    expectedResult = null;
    service = TestBed.inject(UserOptionService);
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

    it('should create a UserOption', () => {
      const userOption = { ...sampleWithNewData };
      const returnedFromService = { ...requireRestSample };
      const expected = { ...sampleWithRequiredData };

      service.create(userOption).subscribe(resp => (expectedResult = resp));

      const req = httpMock.expectOne({ method: 'POST' });
      req.flush(returnedFromService);
      expect(expectedResult).toMatchObject(expected);
    });

    it('should update a UserOption', () => {
      const userOption = { ...sampleWithRequiredData };
      const returnedFromService = { ...requireRestSample };
      const expected = { ...sampleWithRequiredData };

      service.update(userOption).subscribe(resp => (expectedResult = resp));

      const req = httpMock.expectOne({ method: 'PUT' });
      req.flush(returnedFromService);
      expect(expectedResult).toMatchObject(expected);
    });

    it('should partial update a UserOption', () => {
      const patchObject = { ...sampleWithPartialData };
      const returnedFromService = { ...requireRestSample };
      const expected = { ...sampleWithRequiredData };

      service.partialUpdate(patchObject).subscribe(resp => (expectedResult = resp));

      const req = httpMock.expectOne({ method: 'PATCH' });
      req.flush(returnedFromService);
      expect(expectedResult).toMatchObject(expected);
    });

    it('should return a list of UserOption', () => {
      const returnedFromService = { ...requireRestSample };

      const expected = { ...sampleWithRequiredData };

      service.query().subscribe(resp => (expectedResult = resp.body));

      const req = httpMock.expectOne({ method: 'GET' });
      req.flush([returnedFromService]);
      httpMock.verify();
      expect(expectedResult).toMatchObject([expected]);
    });

    it('should delete a UserOption', () => {
      service.delete(123).subscribe();

      const requests = httpMock.match({ method: 'DELETE' });
      expect(requests).toHaveLength(1);
    });

    describe('addUserOptionToCollectionIfMissing', () => {
      it('should add a UserOption to an empty array', () => {
        const userOption: IUserOption = sampleWithRequiredData;
        expectedResult = service.addUserOptionToCollectionIfMissing([], userOption);
        expect(expectedResult).toEqual([userOption]);
      });

      it('should not add a UserOption to an array that contains it', () => {
        const userOption: IUserOption = sampleWithRequiredData;
        const userOptionCollection: IUserOption[] = [
          {
            ...userOption,
          },
          sampleWithPartialData,
        ];
        expectedResult = service.addUserOptionToCollectionIfMissing(userOptionCollection, userOption);
        expect(expectedResult).toHaveLength(2);
      });

      it("should add a UserOption to an array that doesn't contain it", () => {
        const userOption: IUserOption = sampleWithRequiredData;
        const userOptionCollection: IUserOption[] = [sampleWithPartialData];
        expectedResult = service.addUserOptionToCollectionIfMissing(userOptionCollection, userOption);
        expect(expectedResult).toHaveLength(2);
        expect(expectedResult).toContain(userOption);
      });

      it('should add only unique UserOption to an array', () => {
        const userOptionArray: IUserOption[] = [sampleWithRequiredData, sampleWithPartialData, sampleWithFullData];
        const userOptionCollection: IUserOption[] = [sampleWithRequiredData];
        expectedResult = service.addUserOptionToCollectionIfMissing(userOptionCollection, ...userOptionArray);
        expect(expectedResult).toHaveLength(3);
      });

      it('should accept varargs', () => {
        const userOption: IUserOption = sampleWithRequiredData;
        const userOption2: IUserOption = sampleWithPartialData;
        expectedResult = service.addUserOptionToCollectionIfMissing([], userOption, userOption2);
        expect(expectedResult).toEqual([userOption, userOption2]);
      });

      it('should accept null and undefined values', () => {
        const userOption: IUserOption = sampleWithRequiredData;
        expectedResult = service.addUserOptionToCollectionIfMissing([], null, userOption, undefined);
        expect(expectedResult).toEqual([userOption]);
      });

      it('should return initial array if no UserOption is added', () => {
        const userOptionCollection: IUserOption[] = [sampleWithRequiredData];
        expectedResult = service.addUserOptionToCollectionIfMissing(userOptionCollection, undefined, null);
        expect(expectedResult).toEqual(userOptionCollection);
      });
    });

    describe('compareUserOption', () => {
      it('should return true if both entities are null', () => {
        const entity1 = null;
        const entity2 = null;

        const compareResult = service.compareUserOption(entity1, entity2);

        expect(compareResult).toEqual(true);
      });

      it('should return false if one entity is null', () => {
        const entity1 = { id: 6892 };
        const entity2 = null;

        const compareResult1 = service.compareUserOption(entity1, entity2);
        const compareResult2 = service.compareUserOption(entity2, entity1);

        expect(compareResult1).toEqual(false);
        expect(compareResult2).toEqual(false);
      });

      it('should return false if primaryKey differs', () => {
        const entity1 = { id: 6892 };
        const entity2 = { id: 14345 };

        const compareResult1 = service.compareUserOption(entity1, entity2);
        const compareResult2 = service.compareUserOption(entity2, entity1);

        expect(compareResult1).toEqual(false);
        expect(compareResult2).toEqual(false);
      });

      it('should return false if primaryKey matches', () => {
        const entity1 = { id: 6892 };
        const entity2 = { id: 6892 };

        const compareResult1 = service.compareUserOption(entity1, entity2);
        const compareResult2 = service.compareUserOption(entity2, entity1);

        expect(compareResult1).toEqual(true);
        expect(compareResult2).toEqual(true);
      });
    });
  });

  afterEach(() => {
    httpMock.verify();
  });
});
