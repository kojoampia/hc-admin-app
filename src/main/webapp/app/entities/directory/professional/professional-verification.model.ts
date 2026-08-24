import dayjs from 'dayjs/esm';

import { VerificationStatus } from 'app/entities/enumerations/verification-status.model';

/**
 * One recorded verification decision about a professional.
 *
 * Append-only on the server: a change of state is a new row, never an edit, which is why there is no
 * `NewProfessionalVerification` update shape here and no edit form anywhere in the console. The
 * request shape is {@link RecordVerification}.
 *
 * `recordedAt` and `recordedBy` are stamped server-side and are **read-only** — they are absent from
 * the request on purpose, so nothing here can send them. A history whose times and authors the
 * client supplies is not evidence that anybody verified anything.
 */
export interface IProfessionalVerification {
  id: string;
  status?: keyof typeof VerificationStatus | null;
  recordedAt?: dayjs.Dayjs | null;
  recordedBy?: string | null;
  method?: string | null;
  reference?: string | null;
  note?: string | null;
  expiresOn?: dayjs.Dayjs | null;
}

/**
 * What the console may say when recording a decision.
 *
 * Mirrors the api's `ProfessionalVerificationRequest` exactly, including what it leaves out.
 */
export interface RecordVerification {
  professionalId: string;
  status: keyof typeof VerificationStatus;
  method?: string | null;
  reference?: string | null;
  note?: string | null;
  expiresOn?: string | null;
}
