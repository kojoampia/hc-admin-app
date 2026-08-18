import dayjs from 'dayjs/esm';

import { ProfessionalRole } from 'app/entities/enumerations/professional-role.model';

/** The bucket sizes the api will report a series in — the three a wage bill is actually paid on. */
export type EarningsGranularity = 'DAILY' | 'WEEKLY' | 'MONTHLY';

export interface IEarningsBucket {
  periodStart: dayjs.Dayjs;
  periodEnd: dayjs.Dayjs;
  shifts: number;
  amount: number;
}

export interface IProfessionalEarnings {
  professionalId: string;
  professionalName: string | null;
  role: ProfessionalRole | null;
  granularity: EarningsGranularity;
  from: dayjs.Dayjs;
  /**
   * The last date counted — not necessarily the one that was asked for. A shift is payable only
   * once it is in the past, so the api clips the window at yesterday and reports where it actually
   * ended. Label the chart with this, never with the requested range.
   */
  to: dayjs.Dayjs;
  shiftsCompleted: number;
  totalAccrued: number;
  /**
   * Shifts that fell before any rate was configured for the role. Counted in `shiftsCompleted` and
   * contributing nothing to `totalAccrued` — so a non-zero value here is the difference between
   * "earned nothing" and "we never set a price", and the screen has to say which.
   */
  unpricedShifts: number;
  currency: string | null;
  /**
   * Whether the professional has been archived out of the directory. Reported by the api rather
   * than filtered on: archiving removes somebody from the lists you browse and says nothing about
   * whether work already done was done, so they stay in the wage bill and the row can be marked.
   */
  archived: boolean;
  buckets: IEarningsBucket[];
}
