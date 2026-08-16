import { IVendor } from 'app/entities/directory/vendor/vendor.model';
import { FacilityType } from 'app/entities/enumerations/facility-type.model';

/**
 * A place the network works out of: a hospital, clinic, lab or pharmacy.
 *
 * Read-only here. Facility predates the console model — it is declared in the api's
 * `hc-admin-console.jdl` and served from `/api/facilities`, but the console has no screen that
 * creates or edits one. It exists in this model so the vendor record can show the sites a vendor
 * operates; `addressId` and `contactId` are plain string ids from the earlier model rather than
 * references, and nothing reads them yet.
 */
export interface IFacility {
  id: string;
  name?: string | null;
  description?: string | null;
  type?: keyof typeof FacilityType | null;
  addressId?: string | null;
  contactId?: string | null;
  photos?: string | null;
  vendor?: IVendor | null;
}
