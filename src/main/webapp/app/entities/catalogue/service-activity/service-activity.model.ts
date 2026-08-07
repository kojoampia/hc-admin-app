import { ICategory } from 'app/entities/catalogue/category/category.model';

export interface IServiceActivity {
  id: string;
  name?: string | null;
  unit?: string | null;
  unitPrice?: number | null;
  duration?: string | null;
  published?: boolean | null;
  category?: ICategory | null;
}

export type NewServiceActivity = Omit<IServiceActivity, 'id'> & { id: null };
