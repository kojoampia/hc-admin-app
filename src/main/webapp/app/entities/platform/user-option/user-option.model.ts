export interface IUserOption {
  id: string;
  category?: string | null;
  userRef?: string | null;
  metadata?: string | null;
}

export type NewUserOption = Omit<IUserOption, 'id'> & { id: null };
