import dayjs from 'dayjs/esm';

import { IShiftAssignment, NewShiftAssignment } from './shift-assignment.model';

export const sampleWithRequiredData: IShiftAssignment = {
  id: 'df4cd4b8-980e-4278-aec1-9f4eade2a4a2',
  dayIndex: 4,
  shiftDate: dayjs('2023-12-11'),
  shift: 'EVENING',
};

export const sampleWithPartialData: IShiftAssignment = {
  id: '7196f253-558f-4e39-a142-848c137723d6',
  dayIndex: 6,
  shiftDate: dayjs('2023-12-10'),
  shift: 'OFF',
};

export const sampleWithFullData: IShiftAssignment = {
  id: '65509810-a257-4b02-8968-a7a56b72800c',
  dayIndex: 3,
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
