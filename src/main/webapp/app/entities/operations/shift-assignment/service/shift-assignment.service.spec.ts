import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { DATE_FORMAT } from 'app/config/input.constants';
import { IShiftAssignment } from '../shift-assignment.model';
import { sampleWithFullData, sampleWithNewData, sampleWithPartialData, sampleWithRequiredData } from '../shift-assignment.test-samples';

import { RestShiftAssignment, ShiftAssignmentService } from './shift-assignment.service';

const requireRestSample: RestShiftAssignment = {
  ...sampleWithRequiredData,
  shiftDate: sampleWithRequiredData.shiftDate?.format(DATE_FORMAT),
};

describe('ShiftAssignment Service', () => {
  let service: ShiftAssignmentService;
  let httpMock: HttpTestingController;
  let expectedResult: IShiftAssignment | IShiftAssignment[] | boolean | null;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClientTesting()],
    });
    expectedResult = null;
    service = TestBed.inject(ShiftAssignmentService);
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

    it('should create a ShiftAssignment', () => {
      const shiftAssignment = { ...sampleWithNewData };
      const returnedFromService = { ...requireRestSample };
      const expected = { ...sampleWithRequiredData };

      service.create(shiftAssignment).subscribe(resp => (expectedResult = resp));

      const req = httpMock.expectOne({ method: 'POST' });
      req.flush(returnedFromService);
      expect(expectedResult).toMatchObject(expected);
    });

    it('should update a ShiftAssignment', () => {
      const shiftAssignment = { ...sampleWithRequiredData };
      const returnedFromService = { ...requireRestSample };
      const expected = { ...sampleWithRequiredData };

      service.update(shiftAssignment).subscribe(resp => (expectedResult = resp));

      const req = httpMock.expectOne({ method: 'PUT' });
      req.flush(returnedFromService);
      expect(expectedResult).toMatchObject(expected);
    });

    it('should partial update a ShiftAssignment', () => {
      const patchObject = { ...sampleWithPartialData };
      const returnedFromService = { ...requireRestSample };
      const expected = { ...sampleWithRequiredData };

      service.partialUpdate(patchObject).subscribe(resp => (expectedResult = resp));

      const req = httpMock.expectOne({ method: 'PATCH' });
      req.flush(returnedFromService);
      expect(expectedResult).toMatchObject(expected);
    });

    it('should return a list of ShiftAssignment', () => {
      const returnedFromService = { ...requireRestSample };

      const expected = { ...sampleWithRequiredData };

      service.query().subscribe(resp => (expectedResult = resp.body));

      const req = httpMock.expectOne({ method: 'GET' });
      req.flush([returnedFromService]);
      httpMock.verify();
      expect(expectedResult).toMatchObject([expected]);
    });

    it('should delete a ShiftAssignment', () => {
      service.delete(123).subscribe();

      const requests = httpMock.match({ method: 'DELETE' });
      expect(requests).toHaveLength(1);
    });

    describe('addShiftAssignmentToCollectionIfMissing', () => {
      it('should add a ShiftAssignment to an empty array', () => {
        const shiftAssignment: IShiftAssignment = sampleWithRequiredData;
        expectedResult = service.addShiftAssignmentToCollectionIfMissing([], shiftAssignment);
        expect(expectedResult).toEqual([shiftAssignment]);
      });

      it('should not add a ShiftAssignment to an array that contains it', () => {
        const shiftAssignment: IShiftAssignment = sampleWithRequiredData;
        const shiftAssignmentCollection: IShiftAssignment[] = [
          {
            ...shiftAssignment,
          },
          sampleWithPartialData,
        ];
        expectedResult = service.addShiftAssignmentToCollectionIfMissing(shiftAssignmentCollection, shiftAssignment);
        expect(expectedResult).toHaveLength(2);
      });

      it("should add a ShiftAssignment to an array that doesn't contain it", () => {
        const shiftAssignment: IShiftAssignment = sampleWithRequiredData;
        const shiftAssignmentCollection: IShiftAssignment[] = [sampleWithPartialData];
        expectedResult = service.addShiftAssignmentToCollectionIfMissing(shiftAssignmentCollection, shiftAssignment);
        expect(expectedResult).toHaveLength(2);
        expect(expectedResult).toContain(shiftAssignment);
      });

      it('should add only unique ShiftAssignment to an array', () => {
        const shiftAssignmentArray: IShiftAssignment[] = [sampleWithRequiredData, sampleWithPartialData, sampleWithFullData];
        const shiftAssignmentCollection: IShiftAssignment[] = [sampleWithRequiredData];
        expectedResult = service.addShiftAssignmentToCollectionIfMissing(shiftAssignmentCollection, ...shiftAssignmentArray);
        expect(expectedResult).toHaveLength(3);
      });

      it('should accept varargs', () => {
        const shiftAssignment: IShiftAssignment = sampleWithRequiredData;
        const shiftAssignment2: IShiftAssignment = sampleWithPartialData;
        expectedResult = service.addShiftAssignmentToCollectionIfMissing([], shiftAssignment, shiftAssignment2);
        expect(expectedResult).toEqual([shiftAssignment, shiftAssignment2]);
      });

      it('should accept null and undefined values', () => {
        const shiftAssignment: IShiftAssignment = sampleWithRequiredData;
        expectedResult = service.addShiftAssignmentToCollectionIfMissing([], null, shiftAssignment, undefined);
        expect(expectedResult).toEqual([shiftAssignment]);
      });

      it('should return initial array if no ShiftAssignment is added', () => {
        const shiftAssignmentCollection: IShiftAssignment[] = [sampleWithRequiredData];
        expectedResult = service.addShiftAssignmentToCollectionIfMissing(shiftAssignmentCollection, undefined, null);
        expect(expectedResult).toEqual(shiftAssignmentCollection);
      });
    });

    describe('compareShiftAssignment', () => {
      it('should return true if both entities are null', () => {
        const entity1 = null;
        const entity2 = null;

        const compareResult = service.compareShiftAssignment(entity1, entity2);

        expect(compareResult).toEqual(true);
      });

      it('should return false if one entity is null', () => {
        const entity1 = { id: 24117 };
        const entity2 = null;

        const compareResult1 = service.compareShiftAssignment(entity1, entity2);
        const compareResult2 = service.compareShiftAssignment(entity2, entity1);

        expect(compareResult1).toEqual(false);
        expect(compareResult2).toEqual(false);
      });

      it('should return false if primaryKey differs', () => {
        const entity1 = { id: 24117 };
        const entity2 = { id: 21237 };

        const compareResult1 = service.compareShiftAssignment(entity1, entity2);
        const compareResult2 = service.compareShiftAssignment(entity2, entity1);

        expect(compareResult1).toEqual(false);
        expect(compareResult2).toEqual(false);
      });

      it('should return false if primaryKey matches', () => {
        const entity1 = { id: 24117 };
        const entity2 = { id: 24117 };

        const compareResult1 = service.compareShiftAssignment(entity1, entity2);
        const compareResult2 = service.compareShiftAssignment(entity2, entity1);

        expect(compareResult1).toEqual(true);
        expect(compareResult2).toEqual(true);
      });
    });
  });

  afterEach(() => {
    httpMock.verify();
  });
});
