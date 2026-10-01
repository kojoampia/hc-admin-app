export interface IAddress {
  id: string;
  digitalAddress?: string | null;
  streetAddress?: string | null;
  town?: string | null;
  district?: string | null;
  city?: string | null;
  region?: string | null;
  country?: string | null;
}

export type NewAddress = Omit<IAddress, 'id'> & { id: null };
