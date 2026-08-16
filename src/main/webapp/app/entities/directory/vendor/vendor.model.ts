import dayjs from 'dayjs/esm';

import { AccountStatus } from 'app/entities/enumerations/account-status.model';
import { IDocument } from 'app/entities/platform/document/document.model';
import { IFacility } from 'app/entities/platform/facility/facility.model';

export interface IVendor {
  id: string;
  name?: string | null;
  category?: string | null;
  serviceSummary?: string | null;
  contactName?: string | null;
  phone?: string | null;
  email?: string | null;
  city?: string | null;
  status?: keyof typeof AccountStatus | null;
  contractNote?: string | null;
  contractRenewsOn?: dayjs.Dayjs | null;
  orderCount?: number | null;
  spendToDate?: number | null;
  rating?: number | null;

  /**
   * Archived records are hidden from the directory rather than deleted.
   *
   * The active list filters with `isArchived.notEquals=true`, not
   * `.equals=false`: a record written before this field existed has no value at
   * all, and `.equals=false` does not match an absent field. Absent has to mean
   * not archived, or every pre-existing record would vanish from the directory
   * the moment this shipped.
   */
  isArchived?: boolean | null;

  /**
   * The sites this vendor operates, and its filed paperwork.
   *
   * Both arrive nested on `GET /api/vendors/{id}` and neither is written from the console. A vendor
   * is the party the network contracts with; a facility is a place it runs, and one vendor may have
   * several — a pharmacy chain is one contract and many counters.
   */
  facilities?: IFacility[] | null;
  documents?: IDocument[] | null;
}

export type NewVendor = Omit<IVendor, 'id'> & { id: null };
