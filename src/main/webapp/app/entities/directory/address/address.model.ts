export interface IAddress {
  id: string;
  digitalAddress?: string | null;
  streetAddress?: string | null;
  townDistrict?: string | null;
  cityState?: string | null;
  region?: string | null;
  country?: string | null;
}

export type NewAddress = Omit<IAddress, 'id'> & { id: null };
