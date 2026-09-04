import dayjs from 'dayjs/esm';

import { ProfessionalRole } from 'app/entities/enumerations/professional-role.model';
import { ShiftType } from 'app/entities/enumerations/shift-type.model';

/**
 * What one shift pays a professional of a given role and shift type, from a given date.
 *
 * Rates are effective-dated and never edited in place: raising a price adds a row with a later
 * `validFrom` and leaves the superseded one as history. A shift is valued at whichever row was in
 * force on its own date, so a rise never restates a total that has already been paid — which is why
 * the configuration screen's edit control creates a record rather than updating one.
 *
 * `shiftType` joined the key on 2026-09-04, so the price of a night is not the price of a day. The
 * server matches it **exactly**: there is no "any shift type" row and no fallback from an unpriced
 * cell to the role's other rates, so a cell nobody has filled in is absent from `current()` and its
 * shifts are reported as unpriced rather than valued at a neighbour's rate.
 */
export interface IWageRate {
  id: string;
  role?: ProfessionalRole | null;
  shiftType?: ShiftType | null;
  amount?: number | null;
  /** ISO 4217, three letters. `GHS` throughout, but carried per-row rather than assumed. */
  currency?: string | null;
  validFrom?: dayjs.Dayjs | null;
  note?: string | null;
  /** Stamped server-side; the console shows who last moved a price and when. */
  lastModifiedBy?: string | null;
  lastModifiedDate?: dayjs.Dayjs | null;
}

export type NewWageRate = Omit<IWageRate, 'id'> & { id: null };
