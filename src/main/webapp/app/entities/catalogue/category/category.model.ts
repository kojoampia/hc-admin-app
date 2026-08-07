export interface ICategory {
  id: string;
  name?: string | null;
  description?: string | null;
  iconKey?: string | null;
}

export type NewCategory = Omit<ICategory, 'id'> & { id: null };
