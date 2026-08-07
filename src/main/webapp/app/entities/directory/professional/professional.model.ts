import dayjs from 'dayjs/esm';

import { IProfile } from 'app/entities/directory/profile/profile.model';
import { AccountStatus } from 'app/entities/enumerations/account-status.model';
import { ProfessionalRole } from 'app/entities/enumerations/professional-role.model';
import { VerificationStatus } from 'app/entities/enumerations/verification-status.model';
import { ICredential } from 'app/entities/platform/credential/credential.model';
import { IHub } from 'app/entities/platform/hub/hub.model';
import { ITeam } from 'app/entities/platform/team/team.model';

export interface IProfessional {
  id: number;
  role?: keyof typeof ProfessionalRole | null;
  speciality?: string | null;
  licenceNumber?: string | null;
  verification?: keyof typeof VerificationStatus | null;
  status?: keyof typeof AccountStatus | null;
  patientCount?: number | null;
  caseCount?: number | null;
  visitCount?: number | null;
  rating?: number | null;
  joinedOn?: dayjs.Dayjs | null;
  profile?: IProfile | null;
  credential?: ICredential | null;
  team?: ITeam | null;
  hub?: IHub | null;
}

export type NewProfessional = Omit<IProfessional, 'id'> & { id: null };
