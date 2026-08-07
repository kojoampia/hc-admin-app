import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { DATE_FORMAT } from 'app/config/input.constants';
import { IProfessional } from '../professional.model';
import { sampleWithFullData, sampleWithNewData, sampleWithPartialData, sampleWithRequiredData } from '../professional.test-samples';

import { ProfessionalService, RestProfessional } from './professional.service';

const requireRestSample: RestProfessional = {
  ...sampleWithRequiredData,
  joinedOn: sampleWithRequiredData.joinedOn?.format(DATE_FORMAT),
};

describe('Professional Service', () => {
  let service: ProfessionalService;
  let httpMock: HttpTestingController;
  let expectedResult: IProfessional | IProfessional[] | boolean | null;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClientTesting()],
    });
    expectedResult = null;
    service = TestBed.inject(ProfessionalService);
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

    it('should create a Professional', () => {
      const professional = { ...sampleWithNewData };
      const returnedFromService = { ...requireRestSample };
      const expected = { ...sampleWithRequiredData };

      service.create(professional).subscribe(resp => (expectedResult = resp));

      const req = httpMock.expectOne({ method: 'POST' });
      req.flush(returnedFromService);
      expect(expectedResult).toMatchObject(expected);
    });

    it('should update a Professional', () => {
      const professional = { ...sampleWithRequiredData };
      const returnedFromService = { ...requireRestSample };
      const expected = { ...sampleWithRequiredData };

      service.update(professional).subscribe(resp => (expectedResult = resp));

      const req = httpMock.expectOne({ method: 'PUT' });
      req.flush(returnedFromService);
      expect(expectedResult).toMatchObject(expected);
    });

    it('should partial update a Professional', () => {
      const patchObject = { ...sampleWithPartialData };
      const returnedFromService = { ...requireRestSample };
      const expected = { ...sampleWithRequiredData };

      service.partialUpdate(patchObject).subscribe(resp => (expectedResult = resp));

      const req = httpMock.expectOne({ method: 'PATCH' });
      req.flush(returnedFromService);
      expect(expectedResult).toMatchObject(expected);
    });

    it('should return a list of Professional', () => {
      const returnedFromService = { ...requireRestSample };

      const expected = { ...sampleWithRequiredData };

      service.query().subscribe(resp => (expectedResult = resp.body));

      const req = httpMock.expectOne({ method: 'GET' });
      req.flush([returnedFromService]);
      httpMock.verify();
      expect(expectedResult).toMatchObject([expected]);
    });

    it('should delete a Professional', () => {
      service.delete('ABC').subscribe();

      const requests = httpMock.match({ method: 'DELETE' });
      expect(requests).toHaveLength(1);
    });

    describe('addProfessionalToCollectionIfMissing', () => {
      it('should add a Professional to an empty array', () => {
        const professional: IProfessional = sampleWithRequiredData;
        expectedResult = service.addProfessionalToCollectionIfMissing([], professional);
        expect(expectedResult).toEqual([professional]);
      });

      it('should not add a Professional to an array that contains it', () => {
        const professional: IProfessional = sampleWithRequiredData;
        const professionalCollection: IProfessional[] = [
          {
            ...professional,
          },
          sampleWithPartialData,
        ];
        expectedResult = service.addProfessionalToCollectionIfMissing(professionalCollection, professional);
        expect(expectedResult).toHaveLength(2);
      });

      it("should add a Professional to an array that doesn't contain it", () => {
        const professional: IProfessional = sampleWithRequiredData;
        const professionalCollection: IProfessional[] = [sampleWithPartialData];
        expectedResult = service.addProfessionalToCollectionIfMissing(professionalCollection, professional);
        expect(expectedResult).toHaveLength(2);
        expect(expectedResult).toContain(professional);
      });

      it('should add only unique Professional to an array', () => {
        const professionalArray: IProfessional[] = [sampleWithRequiredData, sampleWithPartialData, sampleWithFullData];
        const professionalCollection: IProfessional[] = [sampleWithRequiredData];
        expectedResult = service.addProfessionalToCollectionIfMissing(professionalCollection, ...professionalArray);
        expect(expectedResult).toHaveLength(3);
      });

      it('should accept varargs', () => {
        const professional: IProfessional = sampleWithRequiredData;
        const professional2: IProfessional = sampleWithPartialData;
        expectedResult = service.addProfessionalToCollectionIfMissing([], professional, professional2);
        expect(expectedResult).toEqual([professional, professional2]);
      });

      it('should accept null and undefined values', () => {
        const professional: IProfessional = sampleWithRequiredData;
        expectedResult = service.addProfessionalToCollectionIfMissing([], null, professional, undefined);
        expect(expectedResult).toEqual([professional]);
      });

      it('should return initial array if no Professional is added', () => {
        const professionalCollection: IProfessional[] = [sampleWithRequiredData];
        expectedResult = service.addProfessionalToCollectionIfMissing(professionalCollection, undefined, null);
        expect(expectedResult).toEqual(professionalCollection);
      });
    });

    describe('compareProfessional', () => {
      it('should return true if both entities are null', () => {
        const entity1 = null;
        const entity2 = null;

        const compareResult = service.compareProfessional(entity1, entity2);

        expect(compareResult).toEqual(true);
      });

      it('should return false if one entity is null', () => {
        const entity1 = { id: '2c613901-f64b-4441-b80a-f5fb03b8e466' };
        const entity2 = null;

        const compareResult1 = service.compareProfessional(entity1, entity2);
        const compareResult2 = service.compareProfessional(entity2, entity1);

        expect(compareResult1).toEqual(false);
        expect(compareResult2).toEqual(false);
      });

      it('should return false if primaryKey differs', () => {
        const entity1 = { id: '2c613901-f64b-4441-b80a-f5fb03b8e466' };
        const entity2 = { id: '0e955bb7-9639-4125-b816-aa9d995e679e' };

        const compareResult1 = service.compareProfessional(entity1, entity2);
        const compareResult2 = service.compareProfessional(entity2, entity1);

        expect(compareResult1).toEqual(false);
        expect(compareResult2).toEqual(false);
      });

      it('should return false if primaryKey matches', () => {
        const entity1 = { id: '2c613901-f64b-4441-b80a-f5fb03b8e466' };
        const entity2 = { id: '2c613901-f64b-4441-b80a-f5fb03b8e466' };

        const compareResult1 = service.compareProfessional(entity1, entity2);
        const compareResult2 = service.compareProfessional(entity2, entity1);

        expect(compareResult1).toEqual(true);
        expect(compareResult2).toEqual(true);
      });
    });
  });

  afterEach(() => {
    httpMock.verify();
  });
});
