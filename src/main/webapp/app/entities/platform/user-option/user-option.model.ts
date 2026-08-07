export interface IUserOption {
  id: number;
  category?: string | null;
  userRef?: string | null;
  metadata?: string | null;
}

export type NewUserOption = Omit<IUserOption, 'id'> & { id: null };
