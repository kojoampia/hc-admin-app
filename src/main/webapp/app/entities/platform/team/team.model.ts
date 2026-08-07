import { IProfessional } from 'app/entities/directory/professional/professional.model';

export interface ITeam {
  id: string;
  name?: string | null;
  description?: string | null;
  supervisor?: IProfessional | null;
}

export type NewTeam = Omit<ITeam, 'id'> & { id: null };
