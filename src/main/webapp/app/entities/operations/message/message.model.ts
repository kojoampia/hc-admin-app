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

  /**
   * Where an outbound message went. Absent on everything that arrived at the desk.
   *
   * A message is outbound exactly when this is set — the api carries no direction flag, because a
   * flag and an address can disagree and then neither can be trusted.
   */
  toAddress?: string | null;
  recipientName?: string | null;

  /** The message this one answers. A reply is its own message, not an edit of the original. */
  parentId?: string | null;

  /** Who it went to, when the service knows them. `toAddress` stays the authoritative field. */
  vendorId?: string | null;
  patientId?: string | null;
  professionalId?: string | null;
}

export type NewMessage = Omit<IMessage, 'id'> & { id: null };
