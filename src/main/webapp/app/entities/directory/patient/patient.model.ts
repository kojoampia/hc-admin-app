import dayjs from 'dayjs/esm';

import { IServicePlan } from 'app/entities/catalogue/service-plan/service-plan.model';
import { IAngel } from 'app/entities/directory/angel/angel.model';
import { IProfessional } from 'app/entities/directory/professional/professional.model';
import { IProfile } from 'app/entities/directory/profile/profile.model';
import { AccountStatus } from 'app/entities/enumerations/account-status.model';
import { IHub } from 'app/entities/platform/hub/hub.model';

export interface IPatient {
  id: number;
  status?: keyof typeof AccountStatus | null;
  joinedOn?: dayjs.Dayjs | null;
  lastActiveOn?: dayjs.Dayjs | null;
  caseCount?: number | null;
  profile?: IProfile | null;
  angel?: IAngel | null;
  plan?: IServicePlan | null;
  clinicalLead?: IProfessional | null;
  hub?: IHub | null;
}

export type NewPatient = Omit<IPatient, 'id'> & { id: null };
