import dayjs from 'dayjs/esm';

import { IDocument, NewDocument } from './document.model';

export const sampleWithRequiredData: IDocument = {
  id: 'd73fe592-5ffb-420c-b189-0e268e08fa56',
  name: 'quirkily above and',
  url: 'amongst quiet',
  uploadedAt: dayjs('2023-12-10T19:55'),
};

export const sampleWithPartialData: IDocument = {
  id: '4c01a763-1782-4ef4-807f-b0f82c21feb4',
  name: 'sprinkles overreact',
  url: 'drat treble',
  uploadedAt: dayjs('2023-12-11T09:39'),
};

export const sampleWithFullData: IDocument = {
  id: 'f0e5752e-2dfa-4fee-9c52-1c7118905599',
  name: 'an ugh our',
  description: 'per iterate',
  url: 'guidance more',
  uploadedAt: dayjs('2023-12-11T12:15'),
};

export const sampleWithNewData: NewDocument = {
  name: 'vain',
  url: 'geez furthermore',
  uploadedAt: dayjs('2023-12-11T10:22'),
  id: null,
};

Object.freeze(sampleWithNewData);
Object.freeze(sampleWithRequiredData);
Object.freeze(sampleWithPartialData);
Object.freeze(sampleWithFullData);
