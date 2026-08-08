import dayjs from 'dayjs/esm';

import { AccountStatus } from 'app/entities/enumerations/account-status.model';

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
}

export type NewVendor = Omit<IVendor, 'id'> & { id: null };
