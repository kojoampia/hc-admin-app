import dayjs from 'dayjs/esm';

import { IShiftAssignment, NewShiftAssignment } from './shift-assignment.model';

export const sampleWithRequiredData: IShiftAssignment = {
  id: 27099,
  dayIndex: 6,
  shiftDate: dayjs('2023-12-11'),
  shift: 'OFF',
};

export const sampleWithPartialData: IShiftAssignment = {
  id: 15469,
  dayIndex: 0,
  shiftDate: dayjs('2023-12-11'),
  shift: 'EVENING',
};

export const sampleWithFullData: IShiftAssignment = {
  id: 13038,
  dayIndex: 2,
  shiftDate: dayjs('2023-12-11'),
  shift: 'DAY',
};

export const sampleWithNewData: NewShiftAssignment = {
  dayIndex: 5,
  shiftDate: dayjs('2023-12-11'),
  shift: 'DAY',
  id: null,
};

Object.freeze(sampleWithNewData);
Object.freeze(sampleWithRequiredData);
Object.freeze(sampleWithPartialData);
Object.freeze(sampleWithFullData);
