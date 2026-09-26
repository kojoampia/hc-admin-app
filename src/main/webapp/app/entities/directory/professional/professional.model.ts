import dayjs from 'dayjs/esm';

import { IProfile } from 'app/entities/directory/profile/profile.model';
import { AccountStatus } from 'app/entities/enumerations/account-status.model';
import { ProfessionalRole } from 'app/entities/enumerations/professional-role.model';
import { VerificationStatus } from 'app/entities/enumerations/verification-status.model';
import { IHub } from 'app/entities/platform/hub/hub.model';
import { ITeam } from 'app/entities/platform/team/team.model';
import { IUser } from 'app/admin/user-management/user-management.model';

import { IAddress } from 'app/entities/directory/address/address.model';
import { IdType } from 'app/entities/enumerations/id-type.model';
import { Sex } from 'app/entities/enumerations/sex.model';
import { Title } from 'app/entities/enumerations/title.model';

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

export interface IProfessionalUser {
  id: string;
  login?: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string;
  activated?: boolean;
  langKey?: string;
  authorities?: string[];
  createdBy?: string;
  createdDate?: dayjs.Dayjs | null;
  lastModifiedBy?: string;
  lastModifiedDate?: dayjs.Dayjs | null;
  password?: string;
}

export class ProfessionalUser implements IProfessionalUser {
  constructor(
    public id: string,
    public login?: string,
    public firstName?: string | null,
    public lastName?: string | null,
    public email?: string,
    public activated?: boolean,
    public langKey?: string,
    public authorities?: string[],
    public createdBy?: string,
    public createdDate?: dayjs.Dayjs | null,
    public lastModifiedBy?: string,
    public lastModifiedDate?: dayjs.Dayjs | null,
    public password?: string,
  ) {}
}

/** A user being created has no id yet; everything else is the same record. */
export type NewProfessionalUser = Omit<IProfessionalUser, 'id'> & { id: null };

export class IProfessionalProfile implements IProfile {
  constructor(
    public id: string,
    public accountId?: string | null,
    public title?: keyof typeof Title | null,
    public firstName?: string | null,
    public middleName?: string | null,
    public lastName?: string | null,
    public dateOfBirth?: dayjs.Dayjs | null,
    public sex?: keyof typeof Sex | null,
    public mobilePhone?: string | null,
    public email?: string | null,
    public idType?: keyof typeof IdType | null,
    public idNumber?: string | null,
    public address?: IAddress | null,
  ) {}
}

export type NewProfessionalProfile = Omit<IProfessionalProfile, 'id'> & { id: null };
