import dayjs from 'dayjs/esm';

import { IProfessional } from 'app/entities/directory/professional/professional.model';
import { Priority } from 'app/entities/enumerations/priority.model';
import { TaskState } from 'app/entities/enumerations/task-state.model';
import { IMessage } from 'app/entities/operations/message/message.model';

export interface ITask {
  id: string;
  title?: string | null;
  state?: keyof typeof TaskState | null;
  priority?: keyof typeof Priority | null;
  dueOn?: dayjs.Dayjs | null;
  tag?: string | null;
  createdAt?: dayjs.Dayjs | null;
  owner?: IProfessional | null;
  sourceMessage?: IMessage | null;
}

export type NewTask = Omit<ITask, 'id'> & { id: null };
