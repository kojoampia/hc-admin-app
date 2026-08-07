import dayjs from 'dayjs/esm';

export interface IRosterWeek {
  id: number;
  label?: string | null;
  startDate?: dayjs.Dayjs | null;
  published?: boolean | null;
  publishedAt?: dayjs.Dayjs | null;
}

export type NewRosterWeek = Omit<IRosterWeek, 'id'> & { id: null };
