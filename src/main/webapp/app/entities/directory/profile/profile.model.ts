import dayjs from 'dayjs/esm';

import { IAddress } from 'app/entities/directory/address/address.model';
import { IdType } from 'app/entities/enumerations/id-type.model';
import { Sex } from 'app/entities/enumerations/sex.model';
import { Title } from 'app/entities/enumerations/title.model';

export interface IProfile {
  id: string;
  accountId?: string | null;
  title?: keyof typeof Title | null;
  firstName?: string | null;
  middleName?: string | null;
  lastName?: string | null;
  dateOfBirth?: dayjs.Dayjs | null;
  sex?: keyof typeof Sex | null;
  mobilePhone?: string | null;
  email?: string | null;
  idType?: keyof typeof IdType | null;
  idNumber?: string | null;
  address?: IAddress | null;
}

export type NewProfile = Omit<IProfile, 'id'> & { id: null };
