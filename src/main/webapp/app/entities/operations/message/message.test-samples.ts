import dayjs from 'dayjs/esm';

import { IMessage, NewMessage } from './message.model';

export const sampleWithRequiredData: IMessage = {
  id: '42bfda03-0f8b-4ea3-a0e7-520813ec664a',
  sentAt: dayjs('2023-12-11T11:04'),
  fromAddress: 'uncork',
  senderName: 'until',
  subject: 'verbally animated motor',
  body: '../fake-data/blob/hipster.txt',
  channel: 'VENDOR_PORTAL',
  status: 'READ',
  priority: 'NORMAL',
};

export const sampleWithPartialData: IMessage = {
  id: '0e3af454-266b-4007-87fa-17e609fd9603',
  sentAt: dayjs('2023-12-11T05:44'),
  fromAddress: 'yum',
  senderName: 'um',
  subject: 'creaking lighthearted unto',
  body: '../fake-data/blob/hipster.txt',
  channel: 'VENDOR_PORTAL',
  status: 'REPLIED',
  priority: 'HIGH',
};

export const sampleWithFullData: IMessage = {
  id: '1dbe3ed3-49c7-43ac-8029-cff4cc208105',
  sentAt: dayjs('2023-12-11T13:16'),
  fromAddress: 'little',
  senderName: 'purple',
  subject: 'besides',
  body: '../fake-data/blob/hipster.txt',
  channel: 'PATIENT_APP',
  status: 'READ',
  priority: 'LOW',
};

export const sampleWithNewData: NewMessage = {
  sentAt: dayjs('2023-12-11T12:13'),
  fromAddress: 'broadly gracious',
  senderName: 'hence',
  subject: 'sunny absentmindedly reach',
  body: '../fake-data/blob/hipster.txt',
  channel: 'PROFESSIONAL_APP',
  status: 'REPLIED',
  priority: 'NORMAL',
  id: null,
};

Object.freeze(sampleWithNewData);
Object.freeze(sampleWithRequiredData);
Object.freeze(sampleWithPartialData);
Object.freeze(sampleWithFullData);
