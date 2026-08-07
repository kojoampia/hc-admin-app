import dayjs from 'dayjs/esm';

import { ITask, NewTask } from './task.model';

export const sampleWithRequiredData: ITask = {
  id: 9181,
  title: 'or consequently',
  state: 'DOING',
  priority: 'LOW',
};

export const sampleWithPartialData: ITask = {
  id: 15218,
  title: 'gah worth',
  state: 'TODO',
  priority: 'NORMAL',
  dueOn: dayjs('2023-12-11'),
};

export const sampleWithFullData: ITask = {
  id: 13396,
  title: 'where wherever',
  state: 'DOING',
  priority: 'LOW',
  dueOn: dayjs('2023-12-11'),
  tag: 'expatiate optimistically solder',
  createdAt: dayjs('2023-12-11T06:57'),
};

export const sampleWithNewData: NewTask = {
  title: 'expostulate',
  state: 'TODO',
  priority: 'NORMAL',
  id: null,
};

Object.freeze(sampleWithNewData);
Object.freeze(sampleWithRequiredData);
Object.freeze(sampleWithPartialData);
Object.freeze(sampleWithFullData);
