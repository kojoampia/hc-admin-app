import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { ICredential } from '../credential.model';
import { sampleWithFullData, sampleWithNewData, sampleWithPartialData, sampleWithRequiredData } from '../credential.test-samples';

import { CredentialService, RestCredential } from './credential.service';

const requireRestSample: RestCredential = {
  ...sampleWithRequiredData,
  lastLoginAt: sampleWithRequiredData.lastLoginAt?.toJSON(),
};

describe('Credential Service', () => {
  let service: CredentialService;
  let httpMock: HttpTestingController;
  let expectedResult: ICredential | ICredential[] | boolean | null;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClientTesting()],
    });
    expectedResult = null;
    service = TestBed.inject(CredentialService);
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

    it('should create a Credential', () => {
      const credential = { ...sampleWithNewData };
      const returnedFromService = { ...requireRestSample };
      const expected = { ...sampleWithRequiredData };

      service.create(credential).subscribe(resp => (expectedResult = resp));

      const req = httpMock.expectOne({ method: 'POST' });
      req.flush(returnedFromService);
      expect(expectedResult).toMatchObject(expected);
    });

    it('should update a Credential', () => {
      const credential = { ...sampleWithRequiredData };
      const returnedFromService = { ...requireRestSample };
      const expected = { ...sampleWithRequiredData };

      service.update(credential).subscribe(resp => (expectedResult = resp));

      const req = httpMock.expectOne({ method: 'PUT' });
      req.flush(returnedFromService);
      expect(expectedResult).toMatchObject(expected);
    });

    it('should partial update a Credential', () => {
      const patchObject = { ...sampleWithPartialData };
      const returnedFromService = { ...requireRestSample };
      const expected = { ...sampleWithRequiredData };

      service.partialUpdate(patchObject).subscribe(resp => (expectedResult = resp));

      const req = httpMock.expectOne({ method: 'PATCH' });
      req.flush(returnedFromService);
      expect(expectedResult).toMatchObject(expected);
    });

    it('should return a list of Credential', () => {
      const returnedFromService = { ...requireRestSample };

      const expected = { ...sampleWithRequiredData };

      service.query().subscribe(resp => (expectedResult = resp.body));

      const req = httpMock.expectOne({ method: 'GET' });
      req.flush([returnedFromService]);
      httpMock.verify();
      expect(expectedResult).toMatchObject([expected]);
    });

    it('should delete a Credential', () => {
      service.delete('ABC').subscribe();

      const requests = httpMock.match({ method: 'DELETE' });
      expect(requests).toHaveLength(1);
    });

    describe('addCredentialToCollectionIfMissing', () => {
      it('should add a Credential to an empty array', () => {
        const credential: ICredential = sampleWithRequiredData;
        expectedResult = service.addCredentialToCollectionIfMissing([], credential);
        expect(expectedResult).toEqual([credential]);
      });

      it('should not add a Credential to an array that contains it', () => {
        const credential: ICredential = sampleWithRequiredData;
        const credentialCollection: ICredential[] = [
          {
            ...credential,
          },
          sampleWithPartialData,
        ];
        expectedResult = service.addCredentialToCollectionIfMissing(credentialCollection, credential);
        expect(expectedResult).toHaveLength(2);
      });

      it("should add a Credential to an array that doesn't contain it", () => {
        const credential: ICredential = sampleWithRequiredData;
        const credentialCollection: ICredential[] = [sampleWithPartialData];
        expectedResult = service.addCredentialToCollectionIfMissing(credentialCollection, credential);
        expect(expectedResult).toHaveLength(2);
        expect(expectedResult).toContain(credential);
      });

      it('should add only unique Credential to an array', () => {
        const credentialArray: ICredential[] = [sampleWithRequiredData, sampleWithPartialData, sampleWithFullData];
        const credentialCollection: ICredential[] = [sampleWithRequiredData];
        expectedResult = service.addCredentialToCollectionIfMissing(credentialCollection, ...credentialArray);
        expect(expectedResult).toHaveLength(3);
      });

      it('should accept varargs', () => {
        const credential: ICredential = sampleWithRequiredData;
        const credential2: ICredential = sampleWithPartialData;
        expectedResult = service.addCredentialToCollectionIfMissing([], credential, credential2);
        expect(expectedResult).toEqual([credential, credential2]);
      });

      it('should accept null and undefined values', () => {
        const credential: ICredential = sampleWithRequiredData;
        expectedResult = service.addCredentialToCollectionIfMissing([], null, credential, undefined);
        expect(expectedResult).toEqual([credential]);
      });

      it('should return initial array if no Credential is added', () => {
        const credentialCollection: ICredential[] = [sampleWithRequiredData];
        expectedResult = service.addCredentialToCollectionIfMissing(credentialCollection, undefined, null);
        expect(expectedResult).toEqual(credentialCollection);
      });
    });

    describe('compareCredential', () => {
      it('should return true if both entities are null', () => {
        const entity1 = null;
        const entity2 = null;

        const compareResult = service.compareCredential(entity1, entity2);

        expect(compareResult).toEqual(true);
      });

      it('should return false if one entity is null', () => {
        const entity1 = { id: '35b3b582-8e66-4c2d-9e4a-8ff9d99022d0' };
        const entity2 = null;

        const compareResult1 = service.compareCredential(entity1, entity2);
        const compareResult2 = service.compareCredential(entity2, entity1);

        expect(compareResult1).toEqual(false);
        expect(compareResult2).toEqual(false);
      });

      it('should return false if primaryKey differs', () => {
        const entity1 = { id: '35b3b582-8e66-4c2d-9e4a-8ff9d99022d0' };
        const entity2 = { id: '37c978bd-bd74-4bba-a58a-e21267b95005' };

        const compareResult1 = service.compareCredential(entity1, entity2);
        const compareResult2 = service.compareCredential(entity2, entity1);

        expect(compareResult1).toEqual(false);
        expect(compareResult2).toEqual(false);
      });

      it('should return false if primaryKey matches', () => {
        const entity1 = { id: '35b3b582-8e66-4c2d-9e4a-8ff9d99022d0' };
        const entity2 = { id: '35b3b582-8e66-4c2d-9e4a-8ff9d99022d0' };

        const compareResult1 = service.compareCredential(entity1, entity2);
        const compareResult2 = service.compareCredential(entity2, entity1);

        expect(compareResult1).toEqual(true);
        expect(compareResult2).toEqual(true);
      });
    });
  });

  afterEach(() => {
    httpMock.verify();
  });
});
