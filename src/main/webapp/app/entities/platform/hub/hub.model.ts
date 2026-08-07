import { IAddress } from 'app/entities/directory/address/address.model';

export interface IHub {
  id: string;
  name?: string | null;
  staffCount?: number | null;
  address?: IAddress | null;
}

export type NewHub = Omit<IHub, 'id'> & { id: null };
