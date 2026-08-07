import dayjs from 'dayjs/esm';

import { CredentialRole } from 'app/entities/enumerations/credential-role.model';

export interface ICredential {
  id: string;
  email?: string | null;
  phoneNumber?: string | null;
  passwordHash?: string | null;
  role?: keyof typeof CredentialRole | null;
  enabled?: boolean | null;
  lastLoginAt?: dayjs.Dayjs | null;
}

export type NewCredential = Omit<ICredential, 'id'> & { id: null };
