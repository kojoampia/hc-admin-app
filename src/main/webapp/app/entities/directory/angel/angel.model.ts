export interface IAngel {
  id: number;
  name?: string | null;
  relationship?: string | null;
  phone?: string | null;
  email?: string | null;
  country?: string | null;
}

export type NewAngel = Omit<IAngel, 'id'> & { id: null };
