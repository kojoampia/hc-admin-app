import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { DATE_FORMAT } from 'app/config/input.constants';
import { IVendor } from '../vendor.model';
import { sampleWithFullData, sampleWithNewData, sampleWithPartialData, sampleWithRequiredData } from '../vendor.test-samples';

import { RestVendor, VendorService } from './vendor.service';

const requireRestSample: RestVendor = {
  ...sampleWithRequiredData,
  contractRenewsOn: sampleWithRequiredData.contractRenewsOn?.format(DATE_FORMAT),
};

describe('Vendor Service', () => {
  let service: VendorService;
  let httpMock: HttpTestingController;
  let expectedResult: IVendor | IVendor[] | boolean | null;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClientTesting()],
    });
    expectedResult = null;
    service = TestBed.inject(VendorService);
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

    it('should create a Vendor', () => {
      const vendor = { ...sampleWithNewData };
      const returnedFromService = { ...requireRestSample };
      const expected = { ...sampleWithRequiredData };

      service.create(vendor).subscribe(resp => (expectedResult = resp));

      const req = httpMock.expectOne({ method: 'POST' });
      req.flush(returnedFromService);
      expect(expectedResult).toMatchObject(expected);
    });

    it('should update a Vendor', () => {
      const vendor = { ...sampleWithRequiredData };
      const returnedFromService = { ...requireRestSample };
      const expected = { ...sampleWithRequiredData };

      service.update(vendor).subscribe(resp => (expectedResult = resp));

      const req = httpMock.expectOne({ method: 'PUT' });
      req.flush(returnedFromService);
      expect(expectedResult).toMatchObject(expected);
    });

    it('should partial update a Vendor', () => {
      const patchObject = { ...sampleWithPartialData };
      const returnedFromService = { ...requireRestSample };
      const expected = { ...sampleWithRequiredData };

      service.partialUpdate(patchObject).subscribe(resp => (expectedResult = resp));

      const req = httpMock.expectOne({ method: 'PATCH' });
      req.flush(returnedFromService);
      expect(expectedResult).toMatchObject(expected);
    });

    it('should return a list of Vendor', () => {
      const returnedFromService = { ...requireRestSample };

      const expected = { ...sampleWithRequiredData };

      service.query().subscribe(resp => (expectedResult = resp.body));

      const req = httpMock.expectOne({ method: 'GET' });
      req.flush([returnedFromService]);
      httpMock.verify();
      expect(expectedResult).toMatchObject([expected]);
    });

    it('should delete a Vendor', () => {
      service.delete('ABC').subscribe();

      const requests = httpMock.match({ method: 'DELETE' });
      expect(requests).toHaveLength(1);
    });

    describe('addVendorToCollectionIfMissing', () => {
      it('should add a Vendor to an empty array', () => {
        const vendor: IVendor = sampleWithRequiredData;
        expectedResult = service.addVendorToCollectionIfMissing([], vendor);
        expect(expectedResult).toEqual([vendor]);
      });

      it('should not add a Vendor to an array that contains it', () => {
        const vendor: IVendor = sampleWithRequiredData;
        const vendorCollection: IVendor[] = [
          {
            ...vendor,
          },
          sampleWithPartialData,
        ];
        expectedResult = service.addVendorToCollectionIfMissing(vendorCollection, vendor);
        expect(expectedResult).toHaveLength(2);
      });

      it("should add a Vendor to an array that doesn't contain it", () => {
        const vendor: IVendor = sampleWithRequiredData;
        const vendorCollection: IVendor[] = [sampleWithPartialData];
        expectedResult = service.addVendorToCollectionIfMissing(vendorCollection, vendor);
        expect(expectedResult).toHaveLength(2);
        expect(expectedResult).toContain(vendor);
      });

      it('should add only unique Vendor to an array', () => {
        const vendorArray: IVendor[] = [sampleWithRequiredData, sampleWithPartialData, sampleWithFullData];
        const vendorCollection: IVendor[] = [sampleWithRequiredData];
        expectedResult = service.addVendorToCollectionIfMissing(vendorCollection, ...vendorArray);
        expect(expectedResult).toHaveLength(3);
      });

      it('should accept varargs', () => {
        const vendor: IVendor = sampleWithRequiredData;
        const vendor2: IVendor = sampleWithPartialData;
        expectedResult = service.addVendorToCollectionIfMissing([], vendor, vendor2);
        expect(expectedResult).toEqual([vendor, vendor2]);
      });

      it('should accept null and undefined values', () => {
        const vendor: IVendor = sampleWithRequiredData;
        expectedResult = service.addVendorToCollectionIfMissing([], null, vendor, undefined);
        expect(expectedResult).toEqual([vendor]);
      });

      it('should return initial array if no Vendor is added', () => {
        const vendorCollection: IVendor[] = [sampleWithRequiredData];
        expectedResult = service.addVendorToCollectionIfMissing(vendorCollection, undefined, null);
        expect(expectedResult).toEqual(vendorCollection);
      });
    });

    describe('compareVendor', () => {
      it('should return true if both entities are null', () => {
        const entity1 = null;
        const entity2 = null;

        const compareResult = service.compareVendor(entity1, entity2);

        expect(compareResult).toEqual(true);
      });

      it('should return false if one entity is null', () => {
        const entity1 = { id: '478690b5-4f10-43b0-b67e-1148991a8421' };
        const entity2 = null;

        const compareResult1 = service.compareVendor(entity1, entity2);
        const compareResult2 = service.compareVendor(entity2, entity1);

        expect(compareResult1).toEqual(false);
        expect(compareResult2).toEqual(false);
      });

      it('should return false if primaryKey differs', () => {
        const entity1 = { id: '478690b5-4f10-43b0-b67e-1148991a8421' };
        const entity2 = { id: '38a75b67-70c0-4716-bccf-c7d55a3a8179' };

        const compareResult1 = service.compareVendor(entity1, entity2);
        const compareResult2 = service.compareVendor(entity2, entity1);

        expect(compareResult1).toEqual(false);
        expect(compareResult2).toEqual(false);
      });

      it('should return false if primaryKey matches', () => {
        const entity1 = { id: '478690b5-4f10-43b0-b67e-1148991a8421' };
        const entity2 = { id: '478690b5-4f10-43b0-b67e-1148991a8421' };

        const compareResult1 = service.compareVendor(entity1, entity2);
        const compareResult2 = service.compareVendor(entity2, entity1);

        expect(compareResult1).toEqual(true);
        expect(compareResult2).toEqual(true);
      });
    });
  });

  afterEach(() => {
    httpMock.verify();
  });
});
