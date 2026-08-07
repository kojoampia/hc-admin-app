import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { DATE_FORMAT } from 'app/config/input.constants';
import { IOrganisation } from '../organisation.model';
import { sampleWithFullData, sampleWithNewData, sampleWithPartialData, sampleWithRequiredData } from '../organisation.test-samples';

import { OrganisationService, RestOrganisation } from './organisation.service';

const requireRestSample: RestOrganisation = {
  ...sampleWithRequiredData,
  foundedOn: sampleWithRequiredData.foundedOn?.format(DATE_FORMAT),
};

describe('Organisation Service', () => {
  let service: OrganisationService;
  let httpMock: HttpTestingController;
  let expectedResult: IOrganisation | IOrganisation[] | boolean | null;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClientTesting()],
    });
    expectedResult = null;
    service = TestBed.inject(OrganisationService);
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

    it('should create a Organisation', () => {
      const organisation = { ...sampleWithNewData };
      const returnedFromService = { ...requireRestSample };
      const expected = { ...sampleWithRequiredData };

      service.create(organisation).subscribe(resp => (expectedResult = resp));

      const req = httpMock.expectOne({ method: 'POST' });
      req.flush(returnedFromService);
      expect(expectedResult).toMatchObject(expected);
    });

    it('should update a Organisation', () => {
      const organisation = { ...sampleWithRequiredData };
      const returnedFromService = { ...requireRestSample };
      const expected = { ...sampleWithRequiredData };

      service.update(organisation).subscribe(resp => (expectedResult = resp));

      const req = httpMock.expectOne({ method: 'PUT' });
      req.flush(returnedFromService);
      expect(expectedResult).toMatchObject(expected);
    });

    it('should partial update a Organisation', () => {
      const patchObject = { ...sampleWithPartialData };
      const returnedFromService = { ...requireRestSample };
      const expected = { ...sampleWithRequiredData };

      service.partialUpdate(patchObject).subscribe(resp => (expectedResult = resp));

      const req = httpMock.expectOne({ method: 'PATCH' });
      req.flush(returnedFromService);
      expect(expectedResult).toMatchObject(expected);
    });

    it('should return a list of Organisation', () => {
      const returnedFromService = { ...requireRestSample };

      const expected = { ...sampleWithRequiredData };

      service.query().subscribe(resp => (expectedResult = resp.body));

      const req = httpMock.expectOne({ method: 'GET' });
      req.flush([returnedFromService]);
      httpMock.verify();
      expect(expectedResult).toMatchObject([expected]);
    });

    it('should delete a Organisation', () => {
      service.delete(123).subscribe();

      const requests = httpMock.match({ method: 'DELETE' });
      expect(requests).toHaveLength(1);
    });

    describe('addOrganisationToCollectionIfMissing', () => {
      it('should add a Organisation to an empty array', () => {
        const organisation: IOrganisation = sampleWithRequiredData;
        expectedResult = service.addOrganisationToCollectionIfMissing([], organisation);
        expect(expectedResult).toEqual([organisation]);
      });

      it('should not add a Organisation to an array that contains it', () => {
        const organisation: IOrganisation = sampleWithRequiredData;
        const organisationCollection: IOrganisation[] = [
          {
            ...organisation,
          },
          sampleWithPartialData,
        ];
        expectedResult = service.addOrganisationToCollectionIfMissing(organisationCollection, organisation);
        expect(expectedResult).toHaveLength(2);
      });

      it("should add a Organisation to an array that doesn't contain it", () => {
        const organisation: IOrganisation = sampleWithRequiredData;
        const organisationCollection: IOrganisation[] = [sampleWithPartialData];
        expectedResult = service.addOrganisationToCollectionIfMissing(organisationCollection, organisation);
        expect(expectedResult).toHaveLength(2);
        expect(expectedResult).toContain(organisation);
      });

      it('should add only unique Organisation to an array', () => {
        const organisationArray: IOrganisation[] = [sampleWithRequiredData, sampleWithPartialData, sampleWithFullData];
        const organisationCollection: IOrganisation[] = [sampleWithRequiredData];
        expectedResult = service.addOrganisationToCollectionIfMissing(organisationCollection, ...organisationArray);
        expect(expectedResult).toHaveLength(3);
      });

      it('should accept varargs', () => {
        const organisation: IOrganisation = sampleWithRequiredData;
        const organisation2: IOrganisation = sampleWithPartialData;
        expectedResult = service.addOrganisationToCollectionIfMissing([], organisation, organisation2);
        expect(expectedResult).toEqual([organisation, organisation2]);
      });

      it('should accept null and undefined values', () => {
        const organisation: IOrganisation = sampleWithRequiredData;
        expectedResult = service.addOrganisationToCollectionIfMissing([], null, organisation, undefined);
        expect(expectedResult).toEqual([organisation]);
      });

      it('should return initial array if no Organisation is added', () => {
        const organisationCollection: IOrganisation[] = [sampleWithRequiredData];
        expectedResult = service.addOrganisationToCollectionIfMissing(organisationCollection, undefined, null);
        expect(expectedResult).toEqual(organisationCollection);
      });
    });

    describe('compareOrganisation', () => {
      it('should return true if both entities are null', () => {
        const entity1 = null;
        const entity2 = null;

        const compareResult = service.compareOrganisation(entity1, entity2);

        expect(compareResult).toEqual(true);
      });

      it('should return false if one entity is null', () => {
        const entity1 = { id: 541 };
        const entity2 = null;

        const compareResult1 = service.compareOrganisation(entity1, entity2);
        const compareResult2 = service.compareOrganisation(entity2, entity1);

        expect(compareResult1).toEqual(false);
        expect(compareResult2).toEqual(false);
      });

      it('should return false if primaryKey differs', () => {
        const entity1 = { id: 541 };
        const entity2 = { id: 7272 };

        const compareResult1 = service.compareOrganisation(entity1, entity2);
        const compareResult2 = service.compareOrganisation(entity2, entity1);

        expect(compareResult1).toEqual(false);
        expect(compareResult2).toEqual(false);
      });

      it('should return false if primaryKey matches', () => {
        const entity1 = { id: 541 };
        const entity2 = { id: 541 };

        const compareResult1 = service.compareOrganisation(entity1, entity2);
        const compareResult2 = service.compareOrganisation(entity2, entity1);

        expect(compareResult1).toEqual(true);
        expect(compareResult2).toEqual(true);
      });
    });
  });

  afterEach(() => {
    httpMock.verify();
  });
});
