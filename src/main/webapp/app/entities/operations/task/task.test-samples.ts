import dayjs from 'dayjs/esm';

import { ITask, NewTask } from './task.model';

export const sampleWithRequiredData: ITask = {
  id: '48d52277-8822-451c-b2af-8ac2d6db7e44',
  title: 'supposing',
  state: 'TODO',
  priority: 'NORMAL',
};

export const sampleWithPartialData: ITask = {
  id: '751c019b-7abc-42ac-af39-3813e232715e',
  title: 'fluffy barracks',
  state: 'DONE',
  priority: 'HIGH',
  dueOn: dayjs('2023-12-10'),
};

export const sampleWithFullData: ITask = {
  id: '680ee62d-cbd3-4f39-ad5a-8e3732304692',
  title: 'condense familiar barring',
  state: 'DOING',
  priority: 'HIGH',
  dueOn: dayjs('2023-12-10'),
  tag: 'hm beneficial lumbering',
  createdAt: dayjs('2023-12-11T07:44'),
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
