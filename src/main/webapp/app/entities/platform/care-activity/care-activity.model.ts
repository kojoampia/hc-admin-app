import dayjs from 'dayjs/esm';

import { IPatient } from 'app/entities/directory/patient/patient.model';

export interface ICareActivity {
  id: number;
  name?: string | null;
  description?: string | null;
  occurredOn?: dayjs.Dayjs | null;
  patient?: IPatient | null;
}

export type NewCareActivity = Omit<ICareActivity, 'id'> & { id: null };
