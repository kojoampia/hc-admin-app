import dayjs from 'dayjs/esm';

import { IRosterWeek, NewRosterWeek } from './roster-week.model';

export const sampleWithRequiredData: IRosterWeek = {
  id: 4298,
  label: 'carefully awkwardly highly',
  startDate: dayjs('2023-12-11'),
  published: false,
};

export const sampleWithPartialData: IRosterWeek = {
  id: 9011,
  label: 'millet undergo form',
  startDate: dayjs('2023-12-11'),
  published: false,
  publishedAt: dayjs('2023-12-11T02:10'),
};

export const sampleWithFullData: IRosterWeek = {
  id: 24888,
  label: 'inside militate ha',
  startDate: dayjs('2023-12-10'),
  published: false,
  publishedAt: dayjs('2023-12-11T12:54'),
};

export const sampleWithNewData: NewRosterWeek = {
  label: 'pile',
  startDate: dayjs('2023-12-11'),
  published: false,
  id: null,
};

Object.freeze(sampleWithNewData);
Object.freeze(sampleWithRequiredData);
Object.freeze(sampleWithPartialData);
Object.freeze(sampleWithFullData);
