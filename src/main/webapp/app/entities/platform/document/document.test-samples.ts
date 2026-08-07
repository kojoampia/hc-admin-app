import dayjs from 'dayjs/esm';

import { IDocument, NewDocument } from './document.model';

export const sampleWithRequiredData: IDocument = {
  id: 26644,
  name: 'incidentally before',
  url: 'pish thankfully',
  uploadedAt: dayjs('2023-12-11T14:26'),
};

export const sampleWithPartialData: IDocument = {
  id: 9417,
  name: 'as afterwards cleaner',
  url: 'dereference vivaciously searchingly',
  uploadedAt: dayjs('2023-12-11T09:55'),
};

export const sampleWithFullData: IDocument = {
  id: 31599,
  name: 'chasuble',
  description: 'happy-go-lucky mallard forenenst',
  url: 'an ugh our',
  uploadedAt: dayjs('2023-12-11T08:37'),
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
