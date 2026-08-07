import dayjs from 'dayjs/esm';

import { IProfessional } from 'app/entities/directory/professional/professional.model';
import { ShiftType } from 'app/entities/enumerations/shift-type.model';
import { IRosterWeek } from 'app/entities/operations/roster-week/roster-week.model';

export interface IShiftAssignment {
  id: string;
  dayIndex?: number | null;
  shiftDate?: dayjs.Dayjs | null;
  shift?: keyof typeof ShiftType | null;
  week?: IRosterWeek | null;
  professional?: IProfessional | null;
}

export type NewShiftAssignment = Omit<IShiftAssignment, 'id'> & { id: null };
