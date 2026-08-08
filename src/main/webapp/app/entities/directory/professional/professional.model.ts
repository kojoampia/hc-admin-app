import dayjs from 'dayjs/esm';

import { IProfile } from 'app/entities/directory/profile/profile.model';
import { AccountStatus } from 'app/entities/enumerations/account-status.model';
import { ProfessionalRole } from 'app/entities/enumerations/professional-role.model';
import { VerificationStatus } from 'app/entities/enumerations/verification-status.model';
import { IHub } from 'app/entities/platform/hub/hub.model';
import { ITeam } from 'app/entities/platform/team/team.model';

export interface IProfessional {
  id: string;
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
  team?: ITeam | null;
  hub?: IHub | null;

  /**
   * Archived records are hidden from the directory rather than deleted.
   *
   * The active list filters with `isArchived.notEquals=true`, not
   * `.equals=false`: a record written before this field existed has no value at
   * all, and `.equals=false` does not match an absent field. Absent has to mean
   * not archived, or every pre-existing record would vanish from the directory
   * the moment this shipped.
   */
  isArchived?: boolean | null;
}

export type NewProfessional = Omit<IProfessional, 'id'> & { id: null };
