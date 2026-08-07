import dayjs from 'dayjs/esm';

import { MessageChannel } from 'app/entities/enumerations/message-channel.model';
import { MessageStatus } from 'app/entities/enumerations/message-status.model';
import { Priority } from 'app/entities/enumerations/priority.model';

export interface IMessage {
  id: string;
  sentAt?: dayjs.Dayjs | null;
  fromAddress?: string | null;
  senderName?: string | null;
  subject?: string | null;
  body?: string | null;
  channel?: keyof typeof MessageChannel | null;
  status?: keyof typeof MessageStatus | null;
  priority?: keyof typeof Priority | null;
}

export type NewMessage = Omit<IMessage, 'id'> & { id: null };
