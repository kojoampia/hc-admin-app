import dayjs from 'dayjs/esm';

import { AccountStatus } from 'app/entities/enumerations/account-status.model';

export interface IVendor {
  id: number;
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
}

export type NewVendor = Omit<IVendor, 'id'> & { id: null };
