import dayjs from 'dayjs/esm';

import { IPatient } from 'app/entities/directory/patient/patient.model';
import { IVendor } from 'app/entities/directory/vendor/vendor.model';

export interface IDocument {
  id: number;
  name?: string | null;
  description?: string | null;
  url?: string | null;
  uploadedAt?: dayjs.Dayjs | null;
  patient?: IPatient | null;
  vendor?: IVendor | null;
}

export type NewDocument = Omit<IDocument, 'id'> & { id: null };
