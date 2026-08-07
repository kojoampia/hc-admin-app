import dayjs from 'dayjs/esm';

import { IMessage, NewMessage } from './message.model';

export const sampleWithRequiredData: IMessage = {
  id: 10168,
  sentAt: dayjs('2023-12-10T23:46'),
  fromAddress: 'voluntarily vacantly for',
  senderName: 'probable anti huzzah',
  subject: 'trusting once knuckle',
  body: '../fake-data/blob/hipster.txt',
  channel: 'VENDOR_PORTAL',
  status: 'READ',
  priority: 'NORMAL',
};

export const sampleWithPartialData: IMessage = {
  id: 53,
  sentAt: dayjs('2023-12-11T17:49'),
  fromAddress: 'yahoo',
  senderName: 'prioritize without',
  subject: 'accidentally yum as',
  body: '../fake-data/blob/hipster.txt',
  channel: 'EMAIL',
  status: 'REPLIED',
  priority: 'HIGH',
};

export const sampleWithFullData: IMessage = {
  id: 2775,
  sentAt: dayjs('2023-12-11T16:06'),
  fromAddress: 'midst comparison where',
  senderName: 'what',
  subject: 'little',
  body: '../fake-data/blob/hipster.txt',
  channel: 'PROFESSIONAL_APP',
  status: 'NEW',
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
