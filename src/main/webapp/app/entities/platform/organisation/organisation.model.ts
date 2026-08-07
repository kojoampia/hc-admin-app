import dayjs from 'dayjs/esm';

import { IAddress } from 'app/entities/directory/address/address.model';

export interface IOrganisation {
  id: string;
  name?: string | null;
  legalName?: string | null;
  description?: string | null;
  registrationNumber?: string | null;
  tin?: string | null;
  foundedOn?: dayjs.Dayjs | null;
  switchboard?: string | null;
  email?: string | null;
  deskHours?: string | null;
  address?: IAddress | null;
}

export type NewOrganisation = Omit<IOrganisation, 'id'> & { id: null };
