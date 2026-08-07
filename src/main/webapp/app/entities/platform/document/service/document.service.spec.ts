import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { IDocument } from '../document.model';
import { sampleWithFullData, sampleWithNewData, sampleWithPartialData, sampleWithRequiredData } from '../document.test-samples';

import { DocumentService, RestDocument } from './document.service';

const requireRestSample: RestDocument = {
  ...sampleWithRequiredData,
  uploadedAt: sampleWithRequiredData.uploadedAt?.toJSON(),
};

describe('Document Service', () => {
  let service: DocumentService;
  let httpMock: HttpTestingController;
  let expectedResult: IDocument | IDocument[] | boolean | null;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClientTesting()],
    });
    expectedResult = null;
    service = TestBed.inject(DocumentService);
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

    it('should create a Document', () => {
      const document = { ...sampleWithNewData };
      const returnedFromService = { ...requireRestSample };
      const expected = { ...sampleWithRequiredData };

      service.create(document).subscribe(resp => (expectedResult = resp));

      const req = httpMock.expectOne({ method: 'POST' });
      req.flush(returnedFromService);
      expect(expectedResult).toMatchObject(expected);
    });

    it('should update a Document', () => {
      const document = { ...sampleWithRequiredData };
      const returnedFromService = { ...requireRestSample };
      const expected = { ...sampleWithRequiredData };

      service.update(document).subscribe(resp => (expectedResult = resp));

      const req = httpMock.expectOne({ method: 'PUT' });
      req.flush(returnedFromService);
      expect(expectedResult).toMatchObject(expected);
    });

    it('should partial update a Document', () => {
      const patchObject = { ...sampleWithPartialData };
      const returnedFromService = { ...requireRestSample };
      const expected = { ...sampleWithRequiredData };

      service.partialUpdate(patchObject).subscribe(resp => (expectedResult = resp));

      const req = httpMock.expectOne({ method: 'PATCH' });
      req.flush(returnedFromService);
      expect(expectedResult).toMatchObject(expected);
    });

    it('should return a list of Document', () => {
      const returnedFromService = { ...requireRestSample };

      const expected = { ...sampleWithRequiredData };

      service.query().subscribe(resp => (expectedResult = resp.body));

      const req = httpMock.expectOne({ method: 'GET' });
      req.flush([returnedFromService]);
      httpMock.verify();
      expect(expectedResult).toMatchObject([expected]);
    });

    it('should delete a Document', () => {
      service.delete(123).subscribe();

      const requests = httpMock.match({ method: 'DELETE' });
      expect(requests).toHaveLength(1);
    });

    describe('addDocumentToCollectionIfMissing', () => {
      it('should add a Document to an empty array', () => {
        const document: IDocument = sampleWithRequiredData;
        expectedResult = service.addDocumentToCollectionIfMissing([], document);
        expect(expectedResult).toEqual([document]);
      });

      it('should not add a Document to an array that contains it', () => {
        const document: IDocument = sampleWithRequiredData;
        const documentCollection: IDocument[] = [
          {
            ...document,
          },
          sampleWithPartialData,
        ];
        expectedResult = service.addDocumentToCollectionIfMissing(documentCollection, document);
        expect(expectedResult).toHaveLength(2);
      });

      it("should add a Document to an array that doesn't contain it", () => {
        const document: IDocument = sampleWithRequiredData;
        const documentCollection: IDocument[] = [sampleWithPartialData];
        expectedResult = service.addDocumentToCollectionIfMissing(documentCollection, document);
        expect(expectedResult).toHaveLength(2);
        expect(expectedResult).toContain(document);
      });

      it('should add only unique Document to an array', () => {
        const documentArray: IDocument[] = [sampleWithRequiredData, sampleWithPartialData, sampleWithFullData];
        const documentCollection: IDocument[] = [sampleWithRequiredData];
        expectedResult = service.addDocumentToCollectionIfMissing(documentCollection, ...documentArray);
        expect(expectedResult).toHaveLength(3);
      });

      it('should accept varargs', () => {
        const document: IDocument = sampleWithRequiredData;
        const document2: IDocument = sampleWithPartialData;
        expectedResult = service.addDocumentToCollectionIfMissing([], document, document2);
        expect(expectedResult).toEqual([document, document2]);
      });

      it('should accept null and undefined values', () => {
        const document: IDocument = sampleWithRequiredData;
        expectedResult = service.addDocumentToCollectionIfMissing([], null, document, undefined);
        expect(expectedResult).toEqual([document]);
      });

      it('should return initial array if no Document is added', () => {
        const documentCollection: IDocument[] = [sampleWithRequiredData];
        expectedResult = service.addDocumentToCollectionIfMissing(documentCollection, undefined, null);
        expect(expectedResult).toEqual(documentCollection);
      });
    });

    describe('compareDocument', () => {
      it('should return true if both entities are null', () => {
        const entity1 = null;
        const entity2 = null;

        const compareResult = service.compareDocument(entity1, entity2);

        expect(compareResult).toEqual(true);
      });

      it('should return false if one entity is null', () => {
        const entity1 = { id: 24703 };
        const entity2 = null;

        const compareResult1 = service.compareDocument(entity1, entity2);
        const compareResult2 = service.compareDocument(entity2, entity1);

        expect(compareResult1).toEqual(false);
        expect(compareResult2).toEqual(false);
      });

      it('should return false if primaryKey differs', () => {
        const entity1 = { id: 24703 };
        const entity2 = { id: 4007 };

        const compareResult1 = service.compareDocument(entity1, entity2);
        const compareResult2 = service.compareDocument(entity2, entity1);

        expect(compareResult1).toEqual(false);
        expect(compareResult2).toEqual(false);
      });

      it('should return false if primaryKey matches', () => {
        const entity1 = { id: 24703 };
        const entity2 = { id: 24703 };

        const compareResult1 = service.compareDocument(entity1, entity2);
        const compareResult2 = service.compareDocument(entity2, entity1);

        expect(compareResult1).toEqual(true);
        expect(compareResult2).toEqual(true);
      });
    });
  });

  afterEach(() => {
    httpMock.verify();
  });
});
