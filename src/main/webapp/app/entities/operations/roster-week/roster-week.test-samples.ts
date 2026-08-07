import dayjs from 'dayjs/esm';

import { IRosterWeek, NewRosterWeek } from './roster-week.model';

export const sampleWithRequiredData: IRosterWeek = {
  id: '2ffd28b6-1018-41d2-902e-efd453b2dd93',
  label: 'whether whoever',
  startDate: dayjs('2023-12-11'),
  published: false,
};

export const sampleWithPartialData: IRosterWeek = {
  id: '4d30066d-9c93-437e-9f58-a30d5a848423',
  label: 'gleefully er',
  startDate: dayjs('2023-12-11'),
  published: true,
  publishedAt: dayjs('2023-12-11T02:30'),
};

export const sampleWithFullData: IRosterWeek = {
  id: 'cde81741-87c0-4269-9816-8953b0fb47a1',
  label: 'tuxedo',
  startDate: dayjs('2023-12-11'),
  published: true,
  publishedAt: dayjs('2023-12-10T23:43'),
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
